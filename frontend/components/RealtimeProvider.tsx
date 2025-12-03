"use client";

// ⚠️ Ce composant a été créé avec l'aide d'une IA (ChatGPT) pour la démo vidéo.
// Provider Realtime global pour les toasts claims/comments

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/components/ui/toast";

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Vérifier que supabase est disponible et que nous sommes côté client
    if (typeof window === "undefined") return;
    if (!supabase) return;

    try {
      const channel = supabase.channel("claims");

      channel
        .on("broadcast", { event: "claim_created" }, () => {
          toast("Nouvelle réclamation créée", "info");
        })
        .on("broadcast", { event: "claim_status_changed" }, () => {
          toast("Statut de réclamation mis à jour", "info");
        })
        .on("broadcast", { event: "claim_reply_added" }, () => {
          toast("Nouvelle réponse sur une réclamation", "info");
        })
        .on("broadcast", { event: "claim_assigned" }, () => {
          toast("Une réclamation a été assignée / réassignée", "info");
        })
        .on("broadcast", { event: "claim_comment_added" }, () => {
          toast("Nouveau commentaire sur une réclamation", "info");
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("[Realtime] Abonné au canal Supabase 'claims'");
          }
        });

      return () => {
        try {
          channel.unsubscribe();
        } catch (err) {
          // Ignorer les erreurs de déconnexion
        }
      };
    } catch (error) {
      console.warn("[Realtime] Erreur lors de l'initialisation:", error);
    }
  }, []);

  return <>{children}</>;
}

