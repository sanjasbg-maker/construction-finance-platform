import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Models excluded from the soft-delete / base-fields convention: they're append-only
// by design (see plan decision #4 — an audit trail or a historical exchange rate that
// could itself be edited or soft-deleted defeats its own purpose).
const APPEND_ONLY_MODELS = new Set(["AuditLog", "ExchangeRate"]);

// Fields every other model carries that aren't meaningful in an audit diff.
const HOUSEKEEPING_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "deletedAt",
]);

function uncapitalize(model: string) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function serializeValue(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toFixed" in value) return value.toString();
  return value;
}

/** Strips housekeeping fields from a single record, for CREATE/DELETE audit entries
 * where there's no "before" or "after" to diff against. Assumes the record wasn't
 * fetched with a narrowing `select` (not used anywhere in this codebase yet — if a
 * future module needs one, this will need `id` to always be included). */
function projectFields(record: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    if (HOUSEKEEPING_FIELDS.has(key)) continue;
    result[key] = serializeValue(record[key]);
  }
  return result;
}

function diffRecords(before: Record<string, unknown>, after: Record<string, unknown>) {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (HOUSEKEEPING_FIELDS.has(key)) continue;
    const beforeVal = serializeValue(before[key]);
    const afterVal = serializeValue(after[key]);
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      oldValue[key] = beforeVal;
      newValue[key] = afterVal;
    }
  }
  return { oldValue, newValue };
}

const basePrismaClient = new PrismaClient({ adapter });

function modelDelegate(model: string) {
  return (basePrismaClient as unknown as Record<string, Record<string, (a: unknown) => Promise<unknown>>>)[
    uncapitalize(model)
  ];
}

async function writeAuditLog(
  action: string,
  model: string,
  entityId: string,
  userId: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
) {
  await basePrismaClient.auditLog.create({
    data: {
      action,
      entity: model,
      entityId,
      userId,
      oldValue: oldValue as Prisma.InputJsonValue,
      newValue: newValue as Prisma.InputJsonValue,
    },
  });
}

/**
 * Builds a Prisma client wired for the base-fields convention: soft delete
 * (delete/deleteMany become an update setting deletedAt, reads auto-filter
 * deletedAt: null) plus, when a userId is supplied, createdBy/updatedBy stamping and
 * an automatic AuditLog entry on every create, update, and delete — "every change
 * must be recorded" per BUSINESS_RULES.md, not just field-level updates. One
 * implementation shared by every model instead of relying on each future Server
 * Action to remember all of this (see plan decisions #2 and #3).
 */
function buildClient(userId?: string): PrismaClient {
  const client = basePrismaClient.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (!APPEND_ONLY_MODELS.has(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (!APPEND_ONLY_MODELS.has(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (!APPEND_ONLY_MODELS.has(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (userId && !APPEND_ONLY_MODELS.has(model)) {
            args.data = { ...args.data, createdBy: userId, updatedBy: userId };
          }

          const created = (await query(args)) as Record<string, unknown>;

          if (userId && !APPEND_ONLY_MODELS.has(model)) {
            await writeAuditLog("CREATE", model, String(created.id), userId, null, projectFields(created));
          }

          return created;
        },
        async update({ model, args, query }) {
          if (APPEND_ONLY_MODELS.has(model)) return query(args);

          const before = userId
            ? ((await modelDelegate(model).findUnique({ where: args.where })) as Record<
                string,
                unknown
              > | null)
            : null;

          if (userId) {
            args.data = { ...args.data, updatedBy: userId };
          }

          const after = (await query(args)) as Record<string, unknown>;

          if (userId && before) {
            const { oldValue, newValue } = diffRecords(before, after);
            if (Object.keys(newValue).length > 0) {
              await writeAuditLog("UPDATE", model, String(after.id), userId, oldValue, newValue);
            }
          }

          return after;
        },
        async delete({ model, args, query }) {
          if (APPEND_ONLY_MODELS.has(model)) return query(args);

          const before = userId
            ? ((await modelDelegate(model).findUnique({ where: args.where })) as Record<
                string,
                unknown
              > | null)
            : null;

          const data: Record<string, unknown> = { deletedAt: new Date() };
          if (userId) data.updatedBy = userId;
          const after = (await modelDelegate(model).update({ where: args.where, data })) as Record<
            string,
            unknown
          >;

          if (userId && before) {
            await writeAuditLog("DELETE", model, String(after.id), userId, projectFields(before), null);
          }

          return after;
        },
        async deleteMany({ model, args, query }) {
          if (APPEND_ONLY_MODELS.has(model)) return query(args);

          const data: Record<string, unknown> = { deletedAt: new Date() };
          if (userId) data.updatedBy = userId;
          const result = (await modelDelegate(model).updateMany({ where: args.where, data })) as {
            count: number;
          };

          if (userId && result.count > 0) {
            await writeAuditLog("DELETE_MANY", model, "*", userId, null, { count: result.count });
          }

          return result;
        },
      },
    },
  });

  return client as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof buildClient>;
};

/** Plain client: soft-delete filtering only, no user attribution. For reads in
 * Server Components, where attribution doesn't matter. */
export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Client scoped to the acting user: adds createdBy/updatedBy stamping and automatic
 * audit-log entries (create/update/delete) on top of the same soft-delete behavior.
 * Use this in Server Actions for any write, instead of the plain `prisma` export. */
export function withUser(userId: string) {
  return buildClient(userId);
}
