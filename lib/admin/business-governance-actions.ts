"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
const uuid=z.string().uuid(), reason=z.string().trim().min(8).max(500);
async function run(rpc:string,args:Record<string,unknown>,result:string){
 const {supabase,authorized,user}=await getSuperAdminContext();
 if(!authorized||!user)redirect("/login?next=/dashboard/admin/empresas");
 const {error}=await supabase.rpc(rpc,args);
 if(error){const m=error.message;const code=m.includes("FORBIDDEN")?"forbidden":m.includes("BUSINESS_NOT_FOUND")?"not-found":m.includes("NEW_OWNER_NOT_ACTIVE")?"owner-inactive":m.includes("BUSINESS_ALREADY_ARCHIVED")?"already-archived":m.includes("BUSINESS_NOT_ARCHIVED")?"not-archived":m.includes("BUSINESS_ARCHIVED")?"archived":m.includes("UNCHANGED")?"unchanged":"operation-failed";redirect("/dashboard/admin/empresas?result="+code);}
 revalidatePath("/dashboard/admin/empresas");revalidatePath("/empresas");revalidatePath("/dashboard/empresas");
 redirect("/dashboard/admin/empresas?result="+result);
}
export async function transferBusinessOwnership(fd:FormData){const b=String(fd.get("businessId")||""),u=String(fd.get("newOwnerId")||""),r=String(fd.get("reason")||"");if(!uuid.safeParse(b).success||!uuid.safeParse(u).success||!reason.safeParse(r).success)redirect("/dashboard/admin/empresas?result=invalid");await run("admin_transfer_business_ownership",{p_business_id:b,p_new_owner_id:u,p_reason:r},"ownership-transferred");}
export async function setBusinessVisibility(fd:FormData){const b=String(fd.get("businessId")||""),v=String(fd.get("isPublic")||""),r=String(fd.get("reason")||"");if(!uuid.safeParse(b).success||!["true","false"].includes(v)||!reason.safeParse(r).success)redirect("/dashboard/admin/empresas?result=invalid");await run("admin_set_business_visibility",{p_business_id:b,p_is_public:v==="true",p_reason:r},"visibility-updated");}
export async function archiveBusiness(fd:FormData){const b=String(fd.get("businessId")||""),r=String(fd.get("reason")||"");if(!uuid.safeParse(b).success||!reason.safeParse(r).success)redirect("/dashboard/admin/empresas?result=invalid");await run("admin_archive_business",{p_business_id:b,p_reason:r},"archived");}
export async function restoreBusiness(fd:FormData){const b=String(fd.get("businessId")||""),r=String(fd.get("reason")||"");if(!uuid.safeParse(b).success||!reason.safeParse(r).success)redirect("/dashboard/admin/empresas?result=invalid");await run("admin_restore_business",{p_business_id:b,p_reason:r},"restored");}
