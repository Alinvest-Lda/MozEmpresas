export const BUSINESS_PROMOTION_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT:["PENDING"],
  PENDING:["ACTIVE","PAUSED","EXPIRED"],
  ACTIVE:["PAUSED","EXPIRED"],
  PAUSED:["ACTIVE","EXPIRED"],
  EXPIRED:[],
};

export const ADVERTISING_REQUEST_TRANSITIONS: Record<string, readonly string[]> = {
  NEW:["CONTACTED","CANCELLED"],
  CONTACTED:["PROPOSAL","CANCELLED"],
  PROPOSAL:["AWAITING_PAYMENT","REJECTED","CANCELLED"],
  AWAITING_PAYMENT:["AWAITING_PAYMENT","PAID","REJECTED","CANCELLED"],
  PAID:["APPROVED"],
  APPROVED:[],
  REJECTED:[],
  CANCELLED:[],
};

export function getAdvertisingRequestNextStatuses(status:string|null):string[] {
  return [...(ADVERTISING_REQUEST_TRANSITIONS[status??"NEW"]??[])];
}

export function getBusinessCampaignNextStatuses(
  campaign:{status:string|null;starts_at:string|null;ends_at:string|null;payment_method?:string|null;paid_at?:string|null;credits_charged?:number|null},
  now=Date.now(),
):string[] {
  const startsAt=campaign.starts_at?new Date(campaign.starts_at).getTime():NaN;
  const endsAt=campaign.ends_at?new Date(campaign.ends_at).getTime():NaN;
  const settled=(campaign.payment_method==="CREDITS"&&Number(campaign.credits_charged??0)>0)||(campaign.payment_method==="MPESA"&&Boolean(campaign.paid_at));
  const inWindow=Number.isFinite(startsAt)&&Number.isFinite(endsAt)&&startsAt<=now&&endsAt>now;
  if(campaign.status==="DRAFT") return ["PENDING"];
  if(campaign.status==="PENDING") return [...(settled&&inWindow?["ACTIVE"]:[]),"PAUSED","EXPIRED"];
  if(campaign.status==="ACTIVE") return ["PAUSED","EXPIRED"];
  if(campaign.status==="PAUSED") return [...(settled&&inWindow?["ACTIVE"]:[]),"EXPIRED"];
  return [];
}

export function getPartnerCampaignNextStatuses(
  status:string|null,
  paymentStatus?:string|null,
  endsAt?:string|null,
  startsAt?:string|null,
  now=Date.now(),
):string[] {
  const starts=startsAt?new Date(startsAt).getTime():NaN;
  const ends=endsAt?new Date(endsAt).getTime():NaN;
  const withinWindow=Number.isFinite(starts)&&Number.isFinite(ends)&&starts<=now&&ends>now;
  if(status==="REQUESTED") return ["APPROVED","REJECTED"];
  if(status==="APPROVED") return paymentStatus==="PAID"&&withinWindow?["ACTIVE"]:!paymentStatus||paymentStatus==="FAILED"?["REJECTED"]:[];
  if(status==="ACTIVE") return ["PAUSED",...(Number.isFinite(ends)&&ends<=now?["ENDED"]:[])];
  if(status==="PAUSED") return [...(paymentStatus==="PAID"&&withinWindow?["ACTIVE"]:[]),...(Number.isFinite(ends)&&ends<=now?["ENDED"]:[])];
  return [];
}
