type PartnerReportEmail = {to:string[];subject:string;html:string;idempotencyKey:string};
export async function sendPartnerReportEmail(message:PartnerReportEmail):Promise<string>{
 const apiKey=process.env.RESEND_API_KEY;
 const from=process.env.RESEND_FROM_EMAIL;
 if(!apiKey||!from) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
 const response=await fetch("https://api.resend.com/emails",{
  method:"POST",
  headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json","Idempotency-Key":message.idempotencyKey},
  body:JSON.stringify({from,to:message.to,subject:message.subject,html:message.html}),
  cache:"no-store",
 });
 const result=await response.json().catch(()=>null) as {id?:string;message?:string}|null;
 if(!response.ok||!result?.id) throw new Error("EMAIL_PROVIDER_UNAVAILABLE");
 return result.id;
}
