"use client";

import { useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type EventType = "PROFILE_VIEW" | "CONTACT_CLICK" | "WHATSAPP_SHARE" | "SEARCH_SUBMITTED" | "SEARCH_SAVED" | "FAVORITE_SAVED" | "OPPORTUNITY_APPLY" | "SIGNUP_CLICK" | "AD_CLICK";

function visitorKey() {
  try {
    const keyName = "mozempresas_visitor_key";
    let key = sessionStorage.getItem(keyName);
    if (!key) {
      key = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "visit-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
      sessionStorage.setItem(keyName, key);
    }
    return key;
  } catch {
    return "visit-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}

export async function recordConversionEvent(input: {
  eventType: EventType;
  entityType?: string;
  entityId?: string;
  source?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("platform_conversion_events").insert({
      user_id: user?.id ?? null,
      visitor_key: visitorKey(),
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      source: input.source ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Tracking must never block navigation or the user action.
  }
}

export function TrackedLink({
  href, eventType, entityType, entityId, source, metadata, className, target, rel, children,
}: {
  href: string;
  eventType: EventType;
  entityType?: string;
  entityId?: string;
  source?: string;
  metadata?: Record<string, string | number | boolean | null>;
  className?: string;
  target?: string;
  rel?: string;
  children: ReactNode;
}) {
  return <a href={href} className={className} target={target} rel={rel} onClick={() => {
    void recordConversionEvent({ eventType, entityType, entityId, source, metadata });
  }}>{children}</a>;
}

export function TrackPageView({ entityType, entityId, source }: { entityType: string; entityId: string; source: string }) {
  useEffect(() => {
    void recordConversionEvent({ eventType: "PROFILE_VIEW", entityType, entityId, source });
  }, [entityType, entityId, source]);
  return null;
}
