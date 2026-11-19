"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const notificationIdSchema = z.string().uuid();

export async function markNotificationRead(formData: FormData): Promise<void> {
  const parsedId = notificationIdSchema.safeParse(String(formData.get("notificationId") || "").trim());
  if (!parsedId.success) return;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return;
  revalidatePath("/dashboard/notificacoes");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return;
  revalidatePath("/dashboard/notificacoes");
  revalidatePath("/dashboard");
}
