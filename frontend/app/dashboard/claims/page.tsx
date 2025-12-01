"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";

type Claim = {
  id: number;
  title: string;
  description: string;
  status: "submitted" | "in_review" | "resolved";
  files: string[] | null;
  createdAt: string;
};

const statusConfig = {
  submitted: {
    label: "Soumis",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  in_review: {
    label: "En cours",
    color: "bg-blue-100 text-blue-800",
    icon: AlertCircle,
  },
  resolved: {
    label: "Résolu",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
};

export default function ClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const data = await api("/api/claims");
      setClaims(data);
    } catch (error: any) {
      toast("Erreur lors du chargement des réclamations", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes réclamations</h1>
            <p className="text-gray-600 mt-2">
              Gérez toutes vos réclamations en un seul endroit
            </p>
          </div>
          <Link
            href="/dashboard/claims/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nouvelle réclamation
          </Link>
        </div>

        {/* Claims List */}
        {claims.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune réclamation
            </h3>
            <p className="text-gray-600 mb-6">
              Vous n'avez pas encore créé de réclamation
            </p>
            <Link
              href="/dashboard/claims/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Créer ma première réclamation
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => {
              const status = statusConfig[claim.status];
              const StatusIcon = status.icon;
              const date = new Date(claim.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });

              return (
                <div
                  key={claim.id}
                  className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {claim.title}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}
                        >
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {claim.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Créé le {date}</span>
                        {claim.files && claim.files.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText size={14} />
                            {claim.files.length} fichier(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

