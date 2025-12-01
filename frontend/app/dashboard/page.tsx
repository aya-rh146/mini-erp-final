// frontend/app/dashboard/page.tsx
import { useAuth } from "@/context/AuthContext";

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">
        Bonjour, {user?.name || "Utilisateur"} !
      </h1>
      <p className="text-xl text-gray-600">Rôle : <span className="font-semibold">{user?.role}</span></p>
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