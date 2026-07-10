"use client";

export function DeleteButton({
  action,
  confirmMessage = "Are you sure? This can't be undone from the UI yet.",
  label = "Delete",
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-sm text-red-600 hover:underline dark:text-red-400"
      >
        {label}
      </button>
    </form>
  );
}
