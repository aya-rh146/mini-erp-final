"use client";

// ⚠️ Ce fichier a été généré avec l'aide d'une IA (ChatGPT) pour la démo vidéo.
// Client Supabase Realtime côté frontend (sans auth Supabase)

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (typeof window !== "undefined") {
  // Seulement côté client
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant - les notifications temps réel seront désactivées."
    );
  } else {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      });
    } catch (error) {
      console.warn("[Supabase] Erreur lors de la création du client:", error);
    }
  }
}

export const supabase = supabaseInstance;

