"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSupportTicket(formData:FormData){
 const area=String(formData.get("area")||"").trim(), subject=String(formData.get("subject")||"").trim(), body=String(formData.get("body")||"").trim(), businessId=String(formData.get("business_id")||"").trim()||null;
 if(!area||!subject||!body)return;
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
 const {data:ticket}=await supabase.from("support_tickets").insert({user_id:user.id,business_id:businessId,area,subject,status:"OPEN",priority:"NORMAL"}).select("id").single();
 if(ticket) await supabase.from("support_messages").insert({ticket_id:ticket.id,sender_user_id:user.id,sender_role:"USER",body});
 revalidatePath("/dashboard/suporte");
}

export async function addSupportMessage(formData:FormData){
 const ticketId=String(formData.get("ticket_id")||""), body=String(formData.get("body")||"").trim(); if(!ticketId||!body)return;
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
 const {data:ticket}=await supabase.from("support_tickets").select("id").eq("id",ticketId).eq("user_id",user.id).maybeSingle(); if(!ticket)return;
 await supabase.from("support_messages").insert({ticket_id:ticketId,sender_user_id:user.id,sender_role:"USER",body});
 await supabase.from("support_tickets").update({status:"OPEN",updated_at:new Date().toISOString()}).eq("id",ticketId);
 revalidatePath("/dashboard/suporte");
}
