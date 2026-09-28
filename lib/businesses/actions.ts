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

export async function updateBusiness(_state:BusinessState,formData:FormData):Promise<BusinessState>{
 const id=String(formData.get("businessId")||"");
 const parsed=schema.safeParse({name:formData.get("name"),description:formData.get("description")||undefined,categoryId:formData.get("categoryId")||"",location:formData.get("location")||undefined,phone:formData.get("phone")||undefined,email:formData.get("email")||"",website:formData.get("website")||"",isPublic:formData.get("isPublic")||"true"});
 if(!id || !parsed.success)return{error:"Verifique os dados introduzidos."};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login");
 const {data:business,error:loadError}=await supabase.from("businesses").select("id,slug").eq("id",id).eq("owner_id",user.id).maybeSingle();
 if(loadError || !business)return{error:"Empresa não encontrada ou sem permissão para alterar."};
 const {error}=await supabase.from("businesses").update({name:parsed.data.name,description:parsed.data.description||null,category_id:parsed.data.categoryId||null,location:parsed.data.location||null,phone:parsed.data.phone||null,email:parsed.data.email||null,website:parsed.data.website||null,is_public:parsed.data.isPublic==="true",updated_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id);
 if(error)return{error:"Não foi possível guardar as alterações."};
 const portfolio=Array.from({length:5},(_,index)=>({url:String(formData.get("portfolioImage"+index)||"").trim(),title:String(formData.get("portfolioTitle"+index)||"").trim()})).filter((item)=>item.url);
 const {error:portfolioDeleteError}=await supabase.from("business_portfolio_media").delete().eq("business_id",id);
 if(portfolioDeleteError)return{error:"Os dados foram guardados, mas não foi possível actualizar o portfólio."};
 if(portfolio.length){
   const {error:portfolioInsertError}=await supabase.from("business_portfolio_media").insert(portfolio.map((item,index)=>({business_id:id,image_url:item.url,title:item.title||null,sort_order:index})));
   if(portfolioInsertError)return{error:"Os dados foram guardados, mas não foi possível guardar as imagens do portfólio."};
 }
 revalidatePath("/dashboard/empresas");
 revalidatePath("/dashboard/empresas/"+id);
 revalidatePath("/empresas/"+business.slug);
 redirect("/dashboard/empresas");
}
