import { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_TYPES = new Set(["image/jpeg","image/png","image/webp","image/gif"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf","application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

export async function savePublicationAttachments(
  supabase: SupabaseClient,
  userId: string,
  resourceType: "OPPORTUNITY" | "CONTEST",
  resourceId: string,
  files: FormDataEntryValue[]
) {
  const selected = files.filter((value): value is File => value instanceof File && value.size > 0);
  if (!selected.length) return;

  if (selected.length > 12 || selected.some(file => file.size > 10 * 1024 * 1024)) {
    throw new Error("INVALID_ATTACHMENTS");
  }

  const rows: Array<Record<string, string | number>> = [];
  for (const file of selected) {
    const kind = IMAGE_TYPES.has(file.type) ? "IMAGE" : DOCUMENT_TYPES.has(file.type) ? "DOCUMENT" : null;
    if (!kind) throw new Error("UNSUPPORTED_ATTACHMENT");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 140);
    const path = `${userId}/${resourceType.toLowerCase()}/${resourceId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("publication-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    rows.push({ resource_type: resourceType, resource_id: resourceId, storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size, kind });
  }

  const { error } = await supabase.from("publication_attachments").insert(rows);
  if (error) throw error;
}
