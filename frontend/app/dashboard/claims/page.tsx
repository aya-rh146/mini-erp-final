"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Plus, FileText, Clock, CheckCircle, AlertCircle, X } from "lucide-react";

type Claim = {
  id: number;
  clientId: number;
  title: string;
  description: string;
  status: "submitted" | "in_review" | "resolved" | "rejected";
  reply: string | null;
  filePaths: string[] | null;
  assignedTo: number | null;
  createdAt: string;
  updatedAt: string;
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
  rejected: {
    label: "Rejeté",
    color: "bg-red-100 text-red-800",
    icon: X,
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
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Chargement des réclamations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Réclamations
            </h1>
            <p className="text-gray-600">
              Gérez toutes vos réclamations en un seul endroit
            </p>
          </div>
          <Link
            href="/dashboard/claims/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Nouvelle réclamation
          </Link>
        </div>

        {/* Claims List */}
        {claims.length === 0 ? (
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText size={40} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Aucune réclamation
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Vous n'avez pas encore créé de réclamation. Commencez par créer votre première réclamation.
              </p>
              <Link
                href="/dashboard/claims/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                Créer ma première réclamation
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {claims.map((claim) => {
              const status = statusConfig[claim.status];
              const StatusIcon = status.icon;
              const date = new Date(claim.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });

              return (
                <Link
                  key={claim.id}
                  href={`/claims/${claim.id}`}
                  className="block group"
                >
                  <Card className="h-full bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {claim.title}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.color} border`}
                          >
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                        {claim.description}
                      </p>
                      <div className="space-y-2 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock size={14} />
                          <span>Créé le {date}</span>
                        </div>
                        {claim.filePaths && claim.filePaths.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FileText size={14} />
                            <span>{claim.filePaths.length} fichier(s) attaché(s)</span>
                          </div>
                        )}
                        {claim.reply && (
                          <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                            <CheckCircle size={14} />
                            <span>Réponse disponible</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

