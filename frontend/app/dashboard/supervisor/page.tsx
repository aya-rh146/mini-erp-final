"use client";

// Page Dashboard Superviseur - Générée avec l'aide d'une IA (ChatGPT)
// Affiche les opérateurs assignés et leurs leads/claims

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";

type Operator = {
  id: number;
  email: string;
  fullName: string | null;
  role: string;
};

type Lead = {
  id: number;
  name: string;
  email: string | null;
  status: string;
  assignedTo: number | null;
  createdAt: string;
};

type Claim = {
  id: number;
  title: string;
  status: string;
  assignedTo: number | null;
  createdAt: string;
};

type Overview = {
  supervisorId: number;
  operators: Operator[];
  leads: Lead[];
  claims: Claim[];
};

export default function SupervisorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "supervisor" && user.role !== "admin") {
        router.push("/dashboard");
      } else {
        loadOverview();
      }
    }
  }, [user, authLoading, router]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await api("/api/supervisor/overview");
      console.log("Supervisor overview data:", data); // Debug
      if (data && typeof data === 'object') {
        setOverview({
          supervisorId: data.supervisorId || 0,
          operators: Array.isArray(data.operators) ? data.operators : [],
          leads: Array.isArray(data.leads) ? data.leads : [],
          claims: Array.isArray(data.claims) ? data.claims : [],
        });
      } else {
        setOverview({
          supervisorId: 0,
          operators: [],
          leads: [],
          claims: [],
        });
      }
    } catch (error: any) {
      console.error("Error loading overview:", error);
      // En cas d'erreur, initialiser avec des valeurs vides
      setOverview({
        supervisorId: 0,
        operators: [],
        leads: [],
        claims: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || !user || (user.role !== "supervisor" && user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              Aucune donnée disponible. Vérifiez que vous avez des opérateurs assignés.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Superviseur</h1>
          <p className="text-gray-600 mt-2">Vue d'ensemble de vos opérateurs et leurs activités</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Opérateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.operators.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.leads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Réclamations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.claims.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Opérateurs */}
        <Card>
          <CardHeader>
            <CardTitle>Mes Opérateurs ({overview.operators.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.operators.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun opérateur assigné</p>
            ) : (
              <div className="space-y-2">
                {overview.operators.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{op.fullName || "Sans nom"}</p>
                      <p className="text-sm text-gray-500">{op.email}</p>
                    </div>
                    <Badge variant="outline">Opérateur</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads récents */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Leads récents ({overview.leads.length})</CardTitle>
            <Link href="/dashboard/leads">
              <span className="text-sm text-blue-600 hover:underline">Voir tout</span>
            </Link>
          </CardHeader>
          <CardContent>
            {overview.leads.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun lead</p>
            ) : (
              <div className="space-y-2">
                {overview.leads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-gray-500">{lead.email || "Pas d'email"}</p>
                    </div>
                    <Badge variant="outline">{lead.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claims récentes */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Réclamations récentes ({overview.claims.length})</CardTitle>
            <Link href="/dashboard/claims">
              <span className="text-sm text-blue-600 hover:underline">Voir tout</span>
            </Link>
          </CardHeader>
          <CardContent>
            {overview.claims.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune réclamation</p>
            ) : (
              <div className="space-y-2">
                {overview.claims.slice(0, 5).map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{claim.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(claim.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <Badge variant="outline">{claim.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

