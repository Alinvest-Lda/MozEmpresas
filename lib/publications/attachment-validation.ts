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


const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function startsWithBytes(actual: Uint8Array, expected: readonly number[]) {
  return expected.every((value, index) => actual[index] === value);
}

export async function hasValidAttachmentSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  switch (file.type) {
    case "application/pdf":
      return startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case "image/jpeg":
      return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    case "image/gif":
      return startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38]) &&
        (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
    case "application/msword":
    case "application/vnd.ms-excel":
    case "application/vnd.ms-powerpoint":
      return startsWithBytes(bytes, OLE_SIGNATURE);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return startsWithBytes(bytes, ZIP_SIGNATURE);
    case "text/plain": {
      const sample = await file.slice(0, 4096).arrayBuffer();
      try {
        const decoded = new TextDecoder("utf-8", { fatal: true }).decode(sample);
        return !decoded.includes("\\0");
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

export async function validateAttachmentContentSelection(files: readonly File[]): Promise<boolean> {
  for (const file of files) {
    if (!(await hasValidAttachmentSignature(file))) return false;
  }
  return true;
}

export const PAYMENT_PROOF_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
