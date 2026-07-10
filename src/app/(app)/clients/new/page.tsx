import { ClientForm } from "../ClientForm";
import { createClient } from "../actions";

export default function NewClientPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add Client
      </h1>
      <ClientForm action={createClient} />
    </div>
  );
}
