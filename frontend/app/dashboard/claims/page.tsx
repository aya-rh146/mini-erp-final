"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default function StaffClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      loadClaims();  
    }, 3000);
  
    return () => clearInterval(interval);
  }, []);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const data = await api("/api/claims");
      setClaims(data);
    } catch (error) {
      toast("Erreur lors du chargement des réclamations", "error");
    } finally {
      setLoading(false);
    }
  };

  const canCreate = user?.role === "client";

  const statusConfig: any = {
    submitted: { label: "Soumis", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    in_review: { label: "En cours", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
    resolved: { label: "Résolu", color: "bg-green-100 text-green-800", icon: CheckCircle },
    rejected: { label: "Rejeté", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Réclamations</h1>
          <p className="text-gray-600 mt-1">
            Gérez toutes les réclamations soumises par les clients
          </p>
        </div>

        {canCreate && (
          <Button asChild>
            <Link href="/claims/new">
              <Plus className="mr-2 h-5 w-5" />
              Nouvelle réclamation
            </Link>
          </Button>
        )}
      </div>

      {claims.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Aucune réclamation trouvée</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {claims.map((claim: any) => {
            const StatusIcon = statusConfig[claim.status]?.icon || FileText;
            return (
              <div
                key={claim.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {claim.title}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig[claim.status]?.color}`}
                  >
                    <StatusIcon size={14} />
                    {statusConfig[claim.status]?.label}
                  </span>
                </div>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                  {claim.description}
                </p>
                <div className="text-xs text-gray-500">
                  Créée le{" "}
                  {new Date(claim.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}