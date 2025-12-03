"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, FileText, Clock, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

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
    variant: "warning" as const,
    icon: Clock,
  },
  in_review: {
    label: "En cours",
    variant: "secondary" as const,
    icon: AlertCircle,
  },
  resolved: {
    label: "Résolu",
    variant: "success" as const,
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejeté",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
};

export default function ClaimsPage() {
  const router = useRouter();
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
      <div className="bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes réclamations</h1>
            <p className="text-gray-600 mt-2">
              Gérez toutes vos réclamations en un seul endroit
            </p>
          </div>
          <Link href="/claims/create">
            <Button>
              <Plus size={20} className="mr-2" />
              Nouvelle réclamation
            </Button>
          </Link>
        </div>

        {claims.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <CardTitle className="mb-2">Aucune réclamation</CardTitle>
              <p className="text-gray-600 mb-6">
                Vous n'avez pas encore créé de réclamation
              </p>
              <Link href="/claims/create">
                <Button>
                  <Plus size={20} className="mr-2" />
                  Créer ma première réclamation
                </Button>
              </Link>
            </CardContent>
          </Card>
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
                  onClick={() => router.push(`/claims/${claim.id}`)}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-xl">{claim.title}</CardTitle>
                            <Badge variant={status.variant} className="flex items-center gap-1">
                              <StatusIcon size={14} />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-gray-600 line-clamp-2">{claim.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Créé le {date}</span>
                      {claim.filePaths && claim.filePaths.length > 0 && (
                        <div className="flex items-center gap-2">
                          <FileText size={14} />
                          <span>{claim.filePaths.length} fichier(s)</span>
                          <div className="flex gap-1">
                            {claim.filePaths.map((file, idx) => (
                              <a
                                key={idx}
                                href={`http://localhost:3002${file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={14} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {claim.reply && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-1">Réponse :</p>
                          <p className="text-sm text-blue-800">{claim.reply}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

