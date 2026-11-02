export type AttachmentValidationOptions = {
  maxFiles: number;
  maxBytesPerFile: number;
  allowedMimeTypes: ReadonlySet<string>;
};

export type AttachmentValidationResult =
  | { files: File[]; error?: never }
  | { files?: never; error: "TOO_MANY_ATTACHMENTS" | "ATTACHMENT_TOO_LARGE" | "UNSUPPORTED_ATTACHMENT" };

export function validateAttachmentSelection(
  entries: readonly FormDataEntryValue[],
  options: AttachmentValidationOptions,
): AttachmentValidationResult {
  const files = entries.filter(
    (entry): entry is File => typeof File !== "undefined" && entry instanceof File && entry.size > 0,
  );

  if (files.length > options.maxFiles) return { error: "TOO_MANY_ATTACHMENTS" };
  if (files.some((file) => file.size > options.maxBytesPerFile)) return { error: "ATTACHMENT_TOO_LARGE" };
  if (files.some((file) => !options.allowedMimeTypes.has(file.type))) return { error: "UNSUPPORTED_ATTACHMENT" };

  return { files };
}

export const MARKETPLACE_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const PUBLICATION_ATTACHMENT_TYPES = new Set([
  ...MARKETPLACE_ATTACHMENT_TYPES,
  "image/gif",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);
