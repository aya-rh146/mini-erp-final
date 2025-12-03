"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Plus, Edit, Trash2, User, Loader2, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  email: string;
  fullName: string | null;
  role: "admin" | "supervisor" | "operator" | "client";
  supervisorId: number | null;
  active: boolean;
  createdAt: string;
};

const roleLabels = {
  admin: "Administrateur",
  supervisor: "Superviseur",
  operator: "Opérateur",
  client: "Client",
};

const roleColors = {
  admin: "bg-purple-100 text-purple-800",
  supervisor: "bg-blue-100 text-blue-800",
  operator: "bg-green-100 text-green-800",
  client: "bg-gray-100 text-gray-800",
};

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "client" as User["role"],
    supervisorId: "",
    active: true,
  });

  // Vérifier que l'utilisateur est admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Accès refusé. Seuls les administrateurs peuvent gérer les utilisateurs.</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api("/api/users");
      setUsers(data);
    } catch (error: any) {
      toast(error.message || "Erreur lors du chargement", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        email: userToEdit.email,
        password: "",
        fullName: userToEdit.fullName || "",
        role: userToEdit.role,
        supervisorId: userToEdit.supervisorId?.toString() || "",
        active: userToEdit.active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: "",
        password: "",
        fullName: "",
        role: "client",
        supervisorId: "",
        active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      email: "",
      password: "",
      fullName: "",
      role: "client",
      supervisorId: "",
      active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || (!editingUser && !formData.password)) {
      toast("Email et mot de passe sont obligatoires", "error");
      return;
    }

    try {
      if (editingUser) {
        // Mettre à jour
        await api(`/api/users/${editingUser.id}`, {
          method: "PUT",
          body: JSON.stringify({
            email: formData.email,
            fullName: formData.fullName || null,
            role: formData.role,
            supervisorId: formData.supervisorId ? parseInt(formData.supervisorId) : null,
            active: formData.active,
            ...(formData.password && { password: formData.password }),
          }),
        });
        toast("Utilisateur mis à jour avec succès", "success");
      } else {
        // Créer
        await api("/api/users", {
          method: "POST",
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName || null,
            role: formData.role,
            supervisorId: formData.supervisorId ? parseInt(formData.supervisorId) : null,
            active: formData.active,
          }),
        });
        toast("Utilisateur créé avec succès", "success");
      }
      handleCloseModal();
      loadUsers();
    } catch (error: any) {
      toast(error.message || "Erreur lors de l'enregistrement", "error");
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      return;
    }

    try {
      await api(`/api/users/${userId}`, {
        method: "DELETE",
      });
      toast("Utilisateur supprimé avec succès", "success");
      loadUsers();
    } catch (error: any) {
      toast(error.message || "Erreur lors de la suppression", "error");
    }
  };

  const getSupervisorName = (supervisorId: number | null) => {
    if (!supervisorId) return null;
    const supervisor = users.find((u) => u.id === supervisorId);
    return supervisor?.fullName || supervisor?.email || null;
  };

  if (loading) {
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
            <p className="text-gray-600 mt-2">
              Créez et gérez les utilisateurs du système
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nouvel utilisateur
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Superviseur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de création
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User size={20} className="text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userItem.fullName || "Sans nom"}
                          </div>
                          <div className="text-sm text-gray-500">{userItem.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleColors[userItem.role]}`}
                      >
                        {roleLabels[userItem.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getSupervisorName(userItem.supervisorId) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {userItem.active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <Check size={12} />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          <X size={12} />
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userItem.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(userItem)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(userItem.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Create/Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mot de passe {!editingUser && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required={!editingUser}
                      placeholder={editingUser ? "Laisser vide pour ne pas changer" : ""}
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rôle <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as User["role"] })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="client">Client</option>
                      <option value="operator">Opérateur</option>
                      <option value="supervisor">Superviseur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>

                  {/* Supervisor */}
                  {(formData.role === "operator" || formData.role === "client") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Superviseur
                      </label>
                      <select
                        value={formData.supervisorId}
                        onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Aucun</option>
                        {users
                          .filter((u) => u.role === "supervisor" || u.role === "admin")
                          .map((supervisor) => (
                            <option key={supervisor.id} value={supervisor.id}>
                              {supervisor.fullName || supervisor.email}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Active */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                      Compte actif
                    </label>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {editingUser ? "Mettre à jour" : "Créer"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



