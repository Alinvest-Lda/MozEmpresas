export const AD_SURFACES = [
  ["HOME","Página inicial"],
  ["DIRECTORY","Directório"],
  ["MARKETPLACE","Produtos e serviços"],
  ["OPPORTUNITIES","Oportunidades"],
] as const;

export const AD_SURFACE_SLOTS = {
  HOME:[["HERO","Hero / topo"],["BILLBOARD","Billboard / faixa"],["EXCLUSIVE","Exclusivo"]],
  DIRECTORY:[["BILLBOARD","Billboard / faixa"],["FEATURED","Destaque contextual"],["INFEED","Dentro do conteúdo"],["CONTEXT","Contextual"]],
  MARKETPLACE:[["BILLBOARD","Billboard / faixa"],["FEATURED","Destaque contextual"],["EXCLUSIVE","Exclusivo"],["INFEED","Dentro do conteúdo"]],
  OPPORTUNITIES:[["BILLBOARD","Billboard / faixa"],["FEATURED","Destaque contextual"],["INFEED","Dentro do conteúdo"]],
} as const;

export type AdSurface = keyof typeof AD_SURFACE_SLOTS;

export function isValidAdSurfaceSlot(surface:string,slot:string):boolean {
  const slots=AD_SURFACE_SLOTS[surface as AdSurface];
  return slots?.some(([allowedSlot])=>allowedSlot===slot)??false;
}
