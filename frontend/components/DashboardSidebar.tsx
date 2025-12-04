"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  LogOut,
  TrendingUp,
  UserCheck,
  BarChart3,
  Plus,
} from "lucide-react";

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (path: string) => pathname.startsWith(path);

  const menuItems = [
    {
      href: "/dashboard",
      label: "Tableau de bord",
      icon: LayoutDashboard,
      roles: ["admin", "supervisor", "operator", "client"],
    },
    {
      href: "/dashboard/users",
      label: "Utilisateurs",
      icon: Users,
      roles: ["admin"],
    },
    {
      href: "/dashboard/leads",
      label: "Leads",
      icon: TrendingUp,
      roles: ["admin", "supervisor", "operator"],
    },
    // Réclamations pour le staff (admin/supervisor/operator)
    {
      href: "/dashboard/claims",
      label: "Réclamations",
      icon: FileText,
      roles: ["admin", "supervisor", "operator"],
    },
    {
      href: "/dashboard/supervisor",
      label: "Dashboard Superviseur",
      icon: UserCheck,
      roles: ["admin", "supervisor"],
    },
    {
      href: "/dashboard/operator",
      label: "Dashboard Opérateur",
      icon: UserCheck,
      roles: ["admin", "supervisor", "operator"],
    },
    {
      href: "/dashboard/analytics",
      label: "Analytics",
      icon: BarChart3,
      roles: ["admin"],
    },
    // Menu Client Portal
    {
      href: "/claims",
      label: "Mes réclamations",
      icon: FileText,
      roles: ["client"],
    },
    {
      href: "/claims/new",
      label: "Créer une réclamation",
      icon: Plus,
      roles: ["client"],
    },
  ];

  const visibleItems = menuItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="w-64 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 min-h-screen flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Mini ERP
            </h1>
          </div>
        </div>
        <div className="space-y-2">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user?.full_name || user?.email?.split("@")[0] || user?.email || "Utilisateur"}
        </p>
          <span
            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
              user?.role === "admin"
                ? "bg-purple-100 text-purple-700"
                : user?.role === "supervisor"
                ? "bg-blue-100 text-blue-700"
                : user?.role === "operator"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {user?.role}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleItems.map((item, index) => {
            const Icon = item.icon;

            // خاصية خاصة لـ "Tableau de bord" → يفعّل فقط إذا الـ pathname هو /dashboard بالضبط
            const isDashboardExact = item.href === "/dashboard";
            const isActive = isDashboardExact
              ? pathname === "/dashboard"                    // فقط في الصفحة الرئيسية
              : pathname.startsWith(item.href);                  // الباقي يشتغل بـ startsWith

            return (
              <li
                key={item.href}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 font-medium"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    size={20}
                    className={
                      isActive
                        ? "text-white"
                        : "text-gray-500 group-hover:text-gray-700"
                    }
                  />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-2 h-2 bg-white rounded-full" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 group"
        >
          <LogOut
            size={20}
            className="text-gray-500 group-hover:text-red-600 transition-colors"
          />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </div>
  );
}