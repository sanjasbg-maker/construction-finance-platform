import { DocumentForm } from "../DocumentForm";
import { uploadDocument } from "../actions";
import { getLinkOptions } from "../link-options";

export default async function NewDocumentPage() {
  const linkOptions = await getLinkOptions();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Upload Document</h1>
      <DocumentForm action={uploadDocument} requireFile linkOptions={linkOptions} />
    </div>
  );
}
