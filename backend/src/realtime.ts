// backend/src/realtime.ts
// ⚠️ Ce fichier a été généré avec l'aide d'une IA (ChatGPT) pour la démo vidéo.
// Gère les notifications Realtime via Supabase

import { createClient, SupabaseClient } from "@supabase/supabase-js";

type RealtimeEvent =
  | "claim_created"
  | "claim_status_changed"
  | "claim_reply_added"
  | "claim_assigned"
  | "claim_comment_added";

export type ClaimRealtimePayload = {
  claimId: number;
  status?: string;
  assignedTo?: number | null;
};

export type CommentRealtimePayload = {
  claimId: number;
  commentId: number;
};

let supabaseServerClient: SupabaseClient | null = null;

function getSupabaseServerClient() {
  if (supabaseServerClient) return supabaseServerClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn(
      "[Realtime] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant : les notifications temps réel sont désactivées."
    );
    return null;
  }

  supabaseServerClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return supabaseServerClient;
}

export async function broadcastClaimEvent(
  event: RealtimeEvent,
  payload: ClaimRealtimePayload | CommentRealtimePayload
) {
  const client = getSupabaseServerClient();
  if (!client) return;

  try {
    await client.channel("claims").send({
      type: "broadcast",
      event,
      payload,
    });
  } catch (err) {
    console.error("[Realtime] Erreur d'envoi d'événement Supabase:", err);
  }
}

