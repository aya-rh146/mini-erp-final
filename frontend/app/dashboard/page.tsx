// frontend/app/dashboard/page.tsx
"use client";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Users, FileText, TrendingUp, Package, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    leads: 0,
    clients: 0,
    claims: 0,
    products: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [leads, clients, claims, products] = await Promise.all([
          api("/api/leads").catch(() => []),
          api("/api/clients").catch(() => []),
          api("/api/claims").catch(() => []),
          api("/api/products").catch(() => []),
        ]);
        setStats({
          leads: Array.isArray(leads) ? leads.length : 0,
          clients: Array.isArray(clients) ? clients.length : 0,
          claims: Array.isArray(claims) ? claims.length : 0,
          products: Array.isArray(products) ? products.length : 0,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };
    if (user) loadStats();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  return (
    <div className="p-6 md:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header avec salutation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {getGreeting()}, {user?.name || "Utilisateur"} 👋
          </h1>
          <p className="text-lg text-gray-600">
            Bienvenue sur votre tableau de bord
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <Sparkles className="text-blue-600" size={20} />
          <span className="text-sm font-medium text-blue-700">Système actif</span>
        </div>
      </div>

      {/* Quick Actions */}
      {user?.role === "admin" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/dashboard/users"
            className="group bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-600 rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                <Users size={24} className="text-white" />
              </div>
              <ArrowRight className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Gérer les utilisateurs
            </h3>
            <p className="text-sm text-gray-600">
              Créer et modifier les utilisateurs
            </p>
          </Link>

          <Link
            href="/dashboard/claims"
            className="group bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-600 rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                <FileText size={24} className="text-white" />
              </div>
              <ArrowRight className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Réclamations
            </h3>
            <p className="text-sm text-gray-600">
              Gérer toutes les réclamations
            </p>
          </Link>

          <Link
            href="/dashboard/leads"
            className="group bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-600 rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                <TrendingUp size={24} className="text-white" />
              </div>
              <ArrowRight className="text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Leads
            </h3>
            <p className="text-sm text-gray-600">
              Gérer vos prospects
            </p>
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={32} className="opacity-80" />
            <span className="text-3xl font-bold">{stats.leads}</span>
          </div>
          <p className="text-blue-100 font-medium text-sm">Leads</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <Users size={32} className="opacity-80" />
            <span className="text-3xl font-bold">{stats.clients}</span>
          </div>
          <p className="text-green-100 font-medium text-sm">Clients</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <FileText size={32} className="opacity-80" />
            <span className="text-3xl font-bold">{stats.claims}</span>
          </div>
          <p className="text-purple-100 font-medium text-sm">Réclamations</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <Package size={32} className="opacity-80" />
            <span className="text-3xl font-bold">{stats.products}</span>
          </div>
          <p className="text-orange-100 font-medium text-sm">Produits</p>
        </div>
      </div>
      </div>
    </div>
  );
}