import { describe, expect, it } from "vitest";
import {
  MARKETPLACE_ATTACHMENT_TYPES,
  PUBLICATION_ATTACHMENT_TYPES,
  validateAttachmentSelection,
} from "../lib/publications/attachment-validation";

function file(name: string, type: string, size = 128): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateAttachmentSelection", () => {
  const marketplaceOptions = {
    maxFiles: 10,
    maxBytesPerFile: 10 * 1024 * 1024,
    allowedMimeTypes: MARKETPLACE_ATTACHMENT_TYPES,
  };

  it("accepts supported marketplace files within the limits", () => {
    const result = validateAttachmentSelection(
      [file("foto.webp", "image/webp"), file("proposta.pdf", "application/pdf")],
      marketplaceOptions,
    );
    expect(result.error).toBeUndefined();
    expect(result.files).toHaveLength(2);
  });

  it("ignores empty file inputs and non-file form values", () => {
    const result = validateAttachmentSelection(
      ["", file("empty.pdf", "application/pdf", 0), file("valid.pdf", "application/pdf")],
      marketplaceOptions,
    );
    expect(result.files).toHaveLength(1);
  });

  it("rejects a file count above the configured maximum", () => {
    const entries = Array.from({ length: 11 }, (_, index) => file(`file-${index}.pdf`, "application/pdf"));
    expect(validateAttachmentSelection(entries, marketplaceOptions).error).toBe("TOO_MANY_ATTACHMENTS");
  });

  it("accepts the exact size limit and rejects files above it", () => {
    const exact = file("exact.pdf", "application/pdf", 10 * 1024 * 1024);
    const tooLarge = file("large.pdf", "application/pdf", 10 * 1024 * 1024 + 1);
    expect(validateAttachmentSelection([exact], marketplaceOptions).files).toHaveLength(1);
    expect(validateAttachmentSelection([tooLarge], marketplaceOptions).error).toBe("ATTACHMENT_TOO_LARGE");
  });

  it("rejects unsupported MIME types rather than trusting file extensions", () => {
    const disguised = file("document.pdf", "application/x-msdownload");
    expect(validateAttachmentSelection([disguised], marketplaceOptions).error).toBe("UNSUPPORTED_ATTACHMENT");
  });

  it("supports the wider opportunity publication document/image allowlist", () => {
    expect(PUBLICATION_ATTACHMENT_TYPES.has("image/gif")).toBe(true);
    expect(PUBLICATION_ATTACHMENT_TYPES.has("text/plain")).toBe(true);
    expect(MARKETPLACE_ATTACHMENT_TYPES.has("image/gif")).toBe(false);
  });
});
