"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";

export async function replySupportAsStaff(formData:FormData){
 const ticketId=String(formData.get("ticket_id")||""),body=String(formData.get("body")||"").trim();if(!ticketId||!body)return;
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return;
 const {data:staff}=await supabase.from("platform_members").select("active").eq("user_id",user.id).eq("active",true).maybeSingle();if(!staff)return;
 const {data:ticket}=await supabase.from("support_tickets").select("id").eq("id",ticketId).maybeSingle();if(!ticket)return;
 await supabase.from("support_messages").insert({ticket_id:ticketId,sender_user_id:user.id,sender_role:"BACKOFFICE",body});
 await supabase.from("support_tickets").update({status:"WAITING_USER",updated_at:new Date().toISOString()}).eq("id",ticketId);
 revalidatePath("/dashboard/admin/suporte");
}
