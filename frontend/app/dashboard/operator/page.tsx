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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Opérateur</h1>
          <p className="text-gray-600 mt-2">Vos leads et réclamations assignées</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leads assignés</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Réclamations assignées</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{claims.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Leads */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Mes Leads ({leads.length})</CardTitle>
            <Link href="/dashboard/leads">
              <span className="text-sm text-blue-600 hover:underline">Voir tout</span>
            </Link>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun lead assigné</p>
            ) : (
              <div className="space-y-2">
                {leads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-gray-500">{lead.email || lead.phone || "Pas de contact"}</p>
                    </div>
                    <Badge variant="outline">{lead.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claims */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Mes Réclamations ({claims.length})</CardTitle>
            <Link href="/dashboard/claims">
              <span className="text-sm text-blue-600 hover:underline">Voir tout</span>
            </Link>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune réclamation assignée</p>
            ) : (
              <div className="space-y-2">
                {claims.slice(0, 5).map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{claim.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{claim.description}</p>
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

