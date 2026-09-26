"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
const schema = z.object({ name:z.string().trim().min(2).max(160), description:z.string().trim().max(5000).optional(), categoryId:z.string().uuid().optional().or(z.literal("")), location:z.string().trim().max(160).optional(), phone:z.string().trim().max(40).optional(), email:z.string().trim().email().optional().or(z.literal("")), website:z.string().trim().url().optional().or(z.literal("")), isPublic:z.enum(["true","false"]).default("true") });
function slugify(value:string){return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)}
export type BusinessState={error?:string};
export async function createBusiness(_state:BusinessState,formData:FormData):Promise<BusinessState>{
 const parsed=schema.safeParse({name:formData.get("name"),description:formData.get("description")||undefined,categoryId:formData.get("categoryId")||"",location:formData.get("location")||undefined,phone:formData.get("phone")||undefined,email:formData.get("email")||"",website:formData.get("website")||"",isPublic:formData.get("isPublic")||"true"});
 if(!parsed.success)return{error:"Verifique os dados introduzidos."};
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login");
 let slug=slugify(parsed.data.name); const {data:existing}=await supabase.from("businesses").select("id").eq("slug",slug).maybeSingle(); if(existing)slug=slug+"-"+crypto.randomUUID().slice(0,8);
 const {data:business,error}=await supabase.from("businesses").insert({owner_id:user.id,name:parsed.data.name,slug,description:parsed.data.description||null,category_id:parsed.data.categoryId||null,location:parsed.data.location||null,phone:parsed.data.phone||null,email:parsed.data.email||null,website:parsed.data.website||null,is_public:parsed.data.isPublic==="true"}).select("id").single();
 if(error||!business)return{error:"Não foi possível criar a empresa."};
 const {error:memberError}=await supabase.from("business_members").insert({business_id:business.id,user_id:user.id,role:"owner"});
 if(memberError)return{error:"A empresa foi criada, mas não foi possível concluir a associação do proprietário."};
 revalidatePath("/empresas"); revalidatePath("/dashboard"); redirect("/dashboard/empresas");
}