// frontend/app/dashboard/page.tsx
"use client";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Users, FileText, Plus } from "lucide-react";

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">
        Bonjour, {user?.name || "Utilisateur"} !
      </h1>
      <p className="text-xl text-gray-600">
        Rôle : <span className="font-semibold">{user?.role}</span>
      </p>

      {/* Quick Actions */}
      {user?.role === "admin" && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/users"
            className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Gérer les utilisateurs
                </h3>
                <p className="text-sm text-gray-600">
                  Créer et modifier les utilisateurs
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/claims"
            className="bg-white border-2 border-purple-200 rounded-xl p-6 hover:border-purple-400 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Réclamations
                </h3>
                <p className="text-sm text-gray-600">
                  Gérer toutes les réclamations
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mt-8">
        <div className="bg-blue-100 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold">24</h3>
          <p>Leads</p>
        </div>
        <div className="bg-green-100 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold">18</h3>
          <p>Clients</p>
        </div>
        <div className="bg-purple-100 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold">7</h3>
          <p>Réclamations</p>
        </div>
        <div className="bg-orange-100 p-6 rounded-xl text-center">
          <h3 className="text-3xl font-bold">12</h3>
          <p>Produits</p>
        </div>
      </div>
    </div>
  );
}