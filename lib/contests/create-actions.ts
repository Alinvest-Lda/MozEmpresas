"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text=(v: FormDataEntryValue|null)=>typeof v==="string"?v.trim():"";

function slugify(value:string){
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70);
}

export async function createContest(formData:FormData){
  const supabase=await createClient();
  const {data}=await supabase.auth.getClaims();
  const userId=data?.claims?.sub;
  if(!userId) redirect("/login?next=/dashboard/concursos?publish=1");

  const title=text(formData.get("title"));
  const description=text(formData.get("description"));
  const category=text(formData.get("category"))||null;
  const requirements=text(formData.get("requirements"))||null;
  const rules=text(formData.get("rules"))||null;
  const opensAt=text(formData.get("opens_at"))||null;
  const closesAt=text(formData.get("closes_at"))||null;

  if(!title||!description||(closesAt&&opensAt&&new Date(closesAt)<new Date(opensAt))){
    redirect("/dashboard/concursos?publish=error");
  }

  const slug=slugify(title)+"-"+crypto.randomUUID().slice(0,8);
  const {error}=await supabase.from("contests").insert({
    owner_id:userId,title,slug,description,category,requirements,rules,
    opens_at:opensAt?new Date(opensAt).toISOString():null,
    closes_at:closesAt?new Date(closesAt).toISOString():null,
    status:"OPEN"
  });
  if(error) redirect("/dashboard/concursos?publish=error");
  redirect("/dashboard/concursos?publish=success");
}
