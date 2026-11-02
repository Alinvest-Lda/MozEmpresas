import { SupabaseClient } from "@supabase/supabase-js";
import { PUBLICATION_ATTACHMENT_TYPES, validateAttachmentSelection } from "@/lib/publications/attachment-validation";

export async function savePublicationAttachments(
  supabase: SupabaseClient,
  userId: string,
  resourceType: "OPPORTUNITY" | "CONTEST",
  resourceId: string,
  files: FormDataEntryValue[]
) {
  const validation = validateAttachmentSelection(files, {
    maxFiles: 12,
    maxBytesPerFile: 10 * 1024 * 1024,
    allowedMimeTypes: PUBLICATION_ATTACHMENT_TYPES,
  });
  if (!validation.files) throw new Error(validation.error);
  const selected = validation.files;
  if (!selected.length) return;

  const rows: Array<Record<string, string | number>> = [];
  for (const file of selected) {
    const kind = file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 140);
    const path = `${userId}/${resourceType.toLowerCase()}/${resourceId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("publication-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    rows.push({ resource_type: resourceType, resource_id: resourceId, storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size, kind });
  }

  const { error } = await supabase.from("publication_attachments").insert(rows);
  if (error) throw error;
}
