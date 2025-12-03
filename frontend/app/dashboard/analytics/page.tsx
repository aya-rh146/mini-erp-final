"use client";

// Page Analytics Admin - Générée avec l'aide d'une IA (ChatGPT)
// Affiche 4 graphiques Recharts avec données agrégées

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  Dot,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f97316", "#ef4444", "#8b5cf6"];

type PieData = { name: string; value: number };
type RevenueRow = { month: string; total: number };
type ClaimsStatusRow = { status: string; count: number };
type ClaimsTimeRow = { day: string; count: number };

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leadsStatus, setLeadsStatus] = useState<PieData[]>([]);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [claimsStatus, setClaimsStatus] = useState<ClaimsStatusRow[]>([]);
  const [claimsOverTime, setClaimsOverTime] = useState<ClaimsTimeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "admin") {
        router.push("/dashboard");
      } else {
        loadData();
      }
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsRes, revRes, claimsStatusRes, claimsTimeRes] = await Promise.all([
        api("/api/analytics/leads-status").catch(() => []),
        api("/api/analytics/revenue-monthly").catch(() => []),
        api("/api/analytics/claims-status").catch(() => []),
        api("/api/analytics/claims-over-time").catch(() => []),
      ]);

      // Traiter leads par statut
      setLeadsStatus(
        (leadsRes as { status: string; count: number }[]).map((l) => ({
          name: l.status,
          value: l.count,
        }))
      );

      // Revenu mensuel
      setRevenue(
        (revRes as { month: string; total: string }[]).map((r) => ({
          month: r.month,
          total: Number(r.total),
        }))
      );

      // Claims par statut
      setClaimsStatus(claimsStatusRes as ClaimsStatusRow[]);

      // Claims dans le temps
      setClaimsOverTime(
        (claimsTimeRes as { day: string; count: number }[]).map((c) => ({
          day: c.day,
          count: c.count,
        }))
      );
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || !user || user.role !== "admin") {
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
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Dashboard Analytics
          </h1>
          <p className="text-gray-600">Statistiques et analyses du système</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
            <CardHeader className="px-6 py-5">
              <CardTitle className="text-lg font-bold text-gray-900">Leads par statut</CardTitle>
            </CardHeader>
            <CardContent className="h-64 px-6 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leadsStatus} dataKey="value" nameKey="name" label>
                    {leadsStatus.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
            <CardHeader className="px-6 py-5">
              <CardTitle className="text-lg font-bold text-gray-900">CA mensuel</CardTitle>
            </CardHeader>
            <CardContent className="h-64 px-6 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
            <CardHeader className="px-6 py-5">
              <CardTitle className="text-lg font-bold text-gray-900">Claims par statut</CardTitle>
            </CardHeader>
            <CardContent className="h-64 px-6 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={claimsStatus.map((c) => ({ name: c.status, value: c.count }))}
                    dataKey="value"
                    nameKey="name"
                    label
                  >
                    {claimsStatus.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
            <CardHeader className="px-6 py-5">
              <CardTitle className="text-lg font-bold text-gray-900">Évolution des claims</CardTitle>
            </CardHeader>
            <CardContent className="h-64 px-6 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={claimsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

