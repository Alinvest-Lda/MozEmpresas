"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema=z.object({businessId:z.string().uuid(),userId:z.string().uuid(),role:z.enum(["admin","operator","member","viewer"])});

async function manager(supabase:Awaited<ReturnType<typeof createClient>>,businessId:string,userId:string){
 const {data:owned}=await supabase.from("businesses").select("id").eq("id",businessId).eq("owner_id",userId).is("archived_at",null).maybeSingle();
 if(owned)return true;
 const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",userId).in("role",["owner","admin"]).maybeSingle();
 return Boolean(member);
}

export async function updateBusinessMemberRole(formData:FormData){
 const parsed=schema.safeParse({businessId:formData.get("businessId"),userId:formData.get("userId"),role:formData.get("role")}); if(!parsed.success)return;
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user||!(await manager(supabase,parsed.data.businessId,user.id)))return;
 const {data:current}=await supabase.from("business_members").select("role").eq("business_id",parsed.data.businessId).eq("user_id",parsed.data.userId).maybeSingle();
 const {error}=await supabase.from("business_members").update({role:parsed.data.role}).eq("business_id",parsed.data.businessId).eq("user_id",parsed.data.userId).neq("role","owner");
 if(!error&&current?.role&&current.role!==parsed.data.role)await supabase.from("access_audit_log").insert({business_id:parsed.data.businessId,actor_user_id:user.id,target_user_id:parsed.data.userId,action:"ROLE_CHANGED",role_from:current.role,role_to:parsed.data.role,metadata:{}});
 revalidatePath("/dashboard/acessos");
}

export async function removeBusinessMember(formData:FormData){
 const businessId=String(formData.get("businessId")||""), userId=String(formData.get("userId")||""); if(!businessId||!userId)return;
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user||!(await manager(supabase,businessId,user.id)))return;
 const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",userId).maybeSingle(); if(!member||member.role==="owner")return;
 const {error}=await supabase.from("business_members").delete().eq("business_id",businessId).eq("user_id",userId);
 if(!error)await supabase.from("access_audit_log").insert({business_id:businessId,actor_user_id:user.id,target_user_id:userId,action:"ACCESS_REVOKED",role_from:member.role,role_to:null,metadata:{}});
 revalidatePath("/dashboard/acessos");
}
