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

/**
 * Builds a Prisma client wired for the base-fields convention: soft delete
 * (delete/deleteMany become an update setting deletedAt, reads auto-filter
 * deletedAt: null) plus, when a userId is supplied, createdBy/updatedBy stamping and
 * an automatic field-level AuditLog entry on every update. One implementation shared
 * by every model instead of relying on each future Server Action to remember all of
 * this (see plan decisions #2 and #3).
 */
function buildClient(userId?: string): PrismaClient {
  // Typed `any` deliberately: the extended client is self-referenced inside the
  // `delete`/`deleteMany` handlers below (to route soft deletes through this same
  // client's `update`, so stamping/audit apply consistently), which would otherwise
  // be a circular type inference. Cast back to `PrismaClient` at the return.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = basePrismaClient.$extends({
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
          return query(args);
        },
        async update({ model, args, query }) {
          if (APPEND_ONLY_MODELS.has(model)) return query(args);

          const before = userId
            ? await (basePrismaClient as unknown as Record<string, { findUnique: (a: unknown) => Promise<Record<string, unknown> | null> }>)[
                uncapitalize(model)
              ].findUnique({ where: args.where })
            : null;

          if (userId) {
            args.data = { ...args.data, updatedBy: userId };
          }

          const after = (await query(args)) as Record<string, unknown>;

          if (userId && before) {
            const { oldValue, newValue } = diffRecords(before, after);
            if (Object.keys(newValue).length > 0) {
              await basePrismaClient.auditLog.create({
                data: {
                  action: "UPDATE",
                  entity: model,
                  entityId: String(after.id),
                  userId,
                  oldValue: oldValue as Prisma.InputJsonValue,
                  newValue: newValue as Prisma.InputJsonValue,
                },
              });
            }
          }

          return after;
        },
        async delete({ model, args, query }) {
          if (APPEND_ONLY_MODELS.has(model)) return query(args);
          const data: Record<string, unknown> = { deletedAt: new Date() };
          if (userId) data.updatedBy = userId;
          // Route through this same extended client's `update` (not the raw query)
          // so stamping and audit logging apply consistently to soft deletes too.
          return client[uncapitalize(model)].update({ where: args.where, data });
        },
        async deleteMany({ model, args, query }) {
          if (APPEND_ONLY_MODELS.has(model)) return query(args);
          const data: Record<string, unknown> = { deletedAt: new Date() };
          if (userId) data.updatedBy = userId;
          return client[uncapitalize(model)].updateMany({ where: args.where, data });
        },
      },
    },
  });

  return client as PrismaClient;
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
 * audit-log diffing on top of the same soft-delete behavior. Use this in Server
 * Actions for any write, instead of the plain `prisma` export. */
export function withUser(userId: string) {
  return buildClient(userId);
}
