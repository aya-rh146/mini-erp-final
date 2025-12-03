"use client";

// Page Dashboard Opérateur - Générée avec l'aide d'une IA (ChatGPT)
// Affiche les leads et claims assignés à l'opérateur

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";

type Lead = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

type Claim = {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt: string;
};

export default function OperatorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "operator" && user.role !== "admin" && user.role !== "supervisor") {
        router.push("/dashboard");
      } else {
        loadData();
      }
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, claimsData] = await Promise.all([
        api("/api/leads").catch(() => []),
        api("/api/claims").catch(() => []),
      ]);
      setLeads(leadsData);
      setClaims(claimsData);
    } catch (error: any) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || !user) {
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

  return (
    <div className="p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Dashboard Opérateur
          </h1>
          <p className="text-gray-600">Vos leads et réclamations assignées</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
              <CardTitle className="text-sm font-semibold text-green-900">Leads assignés</CardTitle>
              <div className="p-2.5 bg-green-600 rounded-xl shadow-sm">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-bold text-green-900">{leads.length}</div>
              <p className="text-sm text-green-700 mt-1.5">leads à traiter</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
              <CardTitle className="text-sm font-semibold text-purple-900">Réclamations assignées</CardTitle>
              <div className="p-2.5 bg-purple-600 rounded-xl shadow-sm">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-bold text-purple-900">{claims.length}</div>
              <p className="text-sm text-purple-700 mt-1.5">réclamations en cours</p>
            </CardContent>
          </Card>
        </div>

        {/* Leads */}
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 flex items-center justify-between px-6 py-5 rounded-t-2xl">
            <CardTitle className="text-xl font-bold text-gray-900">
              Mes Leads <span className="text-gray-500 font-normal">({leads.length})</span>
            </CardTitle>
            <Link href="/dashboard/leads" className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline transition-colors">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            {leads.length === 0 ? (
              <div className="text-center py-16">
                <TrendingUp className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 font-medium">Aucun lead assigné</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:border-green-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm mb-1 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-600 truncate">{lead.email || lead.phone || "Pas de contact"}</p>
                    </div>
                    <Badge className="bg-green-600 text-white border-0 text-xs px-2.5 py-1 rounded-lg capitalize ml-3 flex-shrink-0">{lead.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claims */}
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200 flex items-center justify-between px-6 py-5 rounded-t-2xl">
            <CardTitle className="text-xl font-bold text-gray-900">
              Mes Réclamations <span className="text-gray-500 font-normal">({claims.length})</span>
            </CardTitle>
            <Link href="/dashboard/claims" className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline transition-colors">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            {claims.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 font-medium">Aucune réclamation assignée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.slice(0, 5).map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:border-purple-200 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm mb-1 truncate">{claim.title}</p>
                      <p className="text-xs text-gray-600 line-clamp-1">{claim.description}</p>
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

