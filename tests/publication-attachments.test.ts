import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { savePublicationAttachments } from "../lib/publications/attachments";

function mockSupabase(options?: {
  failUploadAt?: number;
  failInsert?: boolean;
  failCleanup?: boolean;
}) {
  let uploadCount = 0;
  const remove = vi.fn(async (_paths: string[]) => ({ error: options?.failCleanup ? new Error("cleanup failed") : null }));
  const upload = vi.fn(async () => {
    uploadCount += 1;
    return { error: options?.failUploadAt === uploadCount ? new Error("upload failed") : null };
  });
  const insert = vi.fn(async () => ({ error: options?.failInsert ? new Error("insert failed") : null }));
  const client = {
    storage: { from: () => ({ upload, remove }) },
    from: () => ({ insert }),
  } as unknown as SupabaseClient;
  return { client, upload, remove, insert };
}

function file(name: string): File {
  return new File([Uint8Array.from([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x37])], name, { type: "application/pdf" });
}

describe("savePublicationAttachments", () => {
  it("uploads files and inserts metadata when every operation succeeds", async () => {
    const mock = mockSupabase();
    await expect(savePublicationAttachments(
      mock.client, "user-1", "OPPORTUNITY", "opportunity-1",
      [file("one.pdf"), file("two.pdf")],
    )).resolves.toBeUndefined();
    expect(mock.upload).toHaveBeenCalledTimes(2);
    expect(mock.insert).toHaveBeenCalledTimes(1);
    expect(mock.remove).not.toHaveBeenCalled();
  });

  it("removes earlier and ambiguously uploaded files when a later upload fails", async () => {
    const mock = mockSupabase({ failUploadAt: 2 });
    await expect(savePublicationAttachments(
      mock.client, "user-1", "OPPORTUNITY", "opportunity-1",
      [file("one.pdf"), file("two.pdf")],
    )).rejects.toThrow("upload failed");
    expect(mock.remove).toHaveBeenCalledTimes(1);
    expect(mock.remove.mock.calls[0][0]).toHaveLength(2);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("removes uploaded files when metadata persistence fails", async () => {
    const mock = mockSupabase({ failInsert: true });
    await expect(savePublicationAttachments(
      mock.client, "user-1", "OPPORTUNITY", "opportunity-1",
      [file("one.pdf")],
    )).rejects.toThrow("insert failed");
    expect(mock.remove).toHaveBeenCalledTimes(1);
    expect(mock.remove.mock.calls[0][0]).toHaveLength(1);
  });

  it("surfaces a distinct error when storage compensation also fails", async () => {
    const mock = mockSupabase({ failInsert: true, failCleanup: true });
    await expect(savePublicationAttachments(
      mock.client, "user-1", "OPPORTUNITY", "opportunity-1",
      [file("one.pdf")],
    )).rejects.toThrow("ATTACHMENT_CLEANUP_FAILED");
  });
});
