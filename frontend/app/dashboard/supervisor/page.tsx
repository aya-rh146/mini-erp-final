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
        const operators = Array.isArray(data.operators) ? data.operators : [];
        const leads = Array.isArray(data.leads) ? data.leads : [];
        const claims = Array.isArray(data.claims) ? data.claims : [];
        
        console.log("Parsed data:", { 
          operators: operators.length, 
          leads: leads.length, 
          claims: claims.length 
        });
        
        setOverview({
          supervisorId: data.supervisorId || 0,
          operators,
          leads,
          claims,
        });
      } else {
        console.warn("Invalid data format:", data);
        setOverview({
          supervisorId: 0,
          operators: [],
          leads: [],
          claims: [],
        });
      }
    } catch (error: any) {
      console.error("Error loading overview:", error);
      console.error("Error details:", error.message, error.stack);
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
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
              <p className="text-gray-600 font-medium">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              Chargement des données...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Dashboard Superviseur
            </h1>
            <p className="text-gray-600">Vue d'ensemble de vos opérateurs et leurs activités</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
              <CardTitle className="text-sm font-semibold text-blue-900">Opérateurs</CardTitle>
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-bold text-blue-900">{overview.operators.length}</div>
              <p className="text-sm text-blue-700 mt-1.5">opérateurs assignés</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
              <CardTitle className="text-sm font-semibold text-green-900">Leads</CardTitle>
              <div className="p-2.5 bg-green-600 rounded-xl shadow-sm">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-bold text-green-900">{overview.leads.length}</div>
              <p className="text-sm text-green-700 mt-1.5">leads en cours</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
              <CardTitle className="text-sm font-semibold text-purple-900">Réclamations</CardTitle>
              <div className="p-2.5 bg-purple-600 rounded-xl shadow-sm">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-bold text-purple-900">{overview.claims.length}</div>
              <p className="text-sm text-purple-700 mt-1.5">réclamations actives</p>
            </CardContent>
          </Card>
        </div>

        {/* Opérateurs */}
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-5 rounded-t-2xl">
            <CardTitle className="text-xl font-bold text-gray-900">
              Mes Opérateurs <span className="text-gray-500 font-normal">({overview.operators.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {overview.operators.length === 0 ? (
              <div className="text-center py-16">
                <Users className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 font-medium mb-1">Aucun opérateur assigné</p>
                <p className="text-sm text-gray-400">Assignez des opérateurs depuis la page Utilisateurs</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {overview.operators.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md flex-shrink-0">
                        {(op.fullName || op.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-base mb-1 truncate">{op.fullName || "Sans nom"}</p>
                        <p className="text-sm text-gray-500 truncate">{op.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white border-0 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm ml-3 flex-shrink-0">
                      Opérateur
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads récents */}
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 flex items-center justify-between px-6 py-5 rounded-t-2xl">
            <CardTitle className="text-xl font-bold text-gray-900">
              Leads récents <span className="text-gray-500 font-normal">({overview.leads.length})</span>
            </CardTitle>
            <Link href="/dashboard/leads" className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline transition-colors">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            {overview.leads.length === 0 ? (
              <div className="text-center py-16">
                <TrendingUp className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 font-medium">Aucun lead</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overview.leads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:border-green-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm mb-1 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-600 truncate">{lead.email || "Pas d'email"}</p>
                    </div>
                    <Badge className="bg-green-600 text-white border-0 text-xs px-2.5 py-1 rounded-lg capitalize ml-3 flex-shrink-0">{lead.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claims récentes */}
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200 flex items-center justify-between px-6 py-5 rounded-t-2xl">
            <CardTitle className="text-xl font-bold text-gray-900">
              Réclamations récentes <span className="text-gray-500 font-normal">({overview.claims.length})</span>
            </CardTitle>
            <Link href="/dashboard/claims" className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline transition-colors">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            {overview.claims.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 font-medium">Aucune réclamation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overview.claims.slice(0, 5).map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:border-purple-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm mb-1 truncate">{claim.title}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(claim.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge className="bg-purple-600 text-white border-0 text-xs px-2.5 py-1 rounded-lg capitalize ml-3 flex-shrink-0">{claim.status}</Badge>
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

