"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Users, FileText, LogOut, Settings, Plus, BarChart3, UserCheck, TrendingUp } from "lucide-react";

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (path: string) => pathname === path;

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
    {
      href: "/claims",
      label: "Mes réclamations",
      icon: FileText,
      roles: ["client"],
    },
    {
      href: "/claims/create",
      label: "Créer une réclamation",
      icon: Plus,
      roles: ["client"],
    },
  ];

  const visibleItems = menuItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Mini ERP</h1>
        <p className="text-sm text-gray-500 mt-1">
          {user?.name || user?.email}
        </p>
        <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {user?.role}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}

