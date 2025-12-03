"use client";

// Page Leads - Générée avec l'aide d'une IA (ChatGPT)
// Gestion complète des leads : CRUD, assignation, conversion en client

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, UserCheck, Loader2, X, TrendingUp } from "lucide-react";

type Lead = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  assignedTo: number | null;
  notes: string | null;
  createdAt: string;
};

type User = {
  id: number;
  email: string;
  fullName: string | null;
  role: string;
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "new",
    assignedTo: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, usersData] = await Promise.all([
        api("/api/leads"),
        api("/api/users").catch(() => []),
      ]);
      setLeads(leadsData);
      setUsers(usersData);
    } catch (error: any) {
      toast(error.message || "Erreur lors du chargement", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (leadToEdit?: Lead) => {
    if (leadToEdit) {
      setEditingLead(leadToEdit);
      setFormData({
        name: leadToEdit.name,
        email: leadToEdit.email || "",
        phone: leadToEdit.phone || "",
        status: leadToEdit.status,
        assignedTo: leadToEdit.assignedTo?.toString() || "",
        notes: leadToEdit.notes || "",
      });
    } else {
      setEditingLead(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        status: "new",
        assignedTo: "",
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLead(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast("Le nom est obligatoire", "error");
      return;
    }

    try {
      if (editingLead) {
        await api(`/api/leads/${editingLead.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            status: formData.status,
            assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
            notes: formData.notes.trim() || null,
          }),
        });
        toast("Lead mis à jour avec succès", "success");
      } else {
        await api("/api/leads", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            status: formData.status,
            assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
            notes: formData.notes.trim() || null,
          }),
        });
        toast("Lead créé avec succès", "success");
      }
      handleCloseModal();
      loadData();
    } catch (error: any) {
      toast(error.message || "Erreur lors de l'enregistrement", "error");
    }
  };

  const handleDelete = async (leadId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce lead ?")) {
      return;
    }

    try {
      await api(`/api/leads/${leadId}`, {
        method: "DELETE",
      });
      toast("Lead supprimé avec succès", "success");
      loadData();
    } catch (error: any) {
      toast(error.message || "Erreur lors de la suppression", "error");
    }
  };

  const handleConvert = async (leadId: number) => {
    if (!confirm("Convertir ce lead en client ?")) {
      return;
    }

    try {
      await api(`/api/leads/${leadId}/convert`, {
        method: "POST",
      });
      toast("Lead converti en client avec succès", "success");
      loadData();
    } catch (error: any) {
      toast(error.message || "Erreur lors de la conversion", "error");
    }
  };

  const getAssignedUserName = (userId: number | null) => {
    if (!userId) return null;
    const assignedUser = users.find((u) => u.id === userId);
    return assignedUser?.fullName || assignedUser?.email || null;
  };

  if (loading) {
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

  const operators = users.filter((u) => u.role === "operator" || u.role === "admin" || u.role === "supervisor");

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              Gestion des Leads
            </h1>
            <p className="text-gray-600">Gérez vos prospects et convertissez-les en clients</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Nouveau lead
          </button>
        </div>

        {leads.length === 0 ? (
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-md">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp size={40} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun lead</h3>
              <p className="text-gray-600 mb-8">Commencez par créer votre premier lead</p>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                Créer mon premier lead
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead) => (
              <Card key={lead.id} className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 px-6 py-5 rounded-t-2xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg font-bold text-gray-900">{lead.name}</CardTitle>
                      </div>
                      <Badge className="bg-green-600 text-white border-0 text-xs px-2.5 py-1 rounded-lg capitalize">{lead.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 mb-4">
                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-gray-400">📧</span>
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-gray-400">📞</span>
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.assignedTo && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-gray-400">👤</span>
                        <span>Assigné à : {getAssignedUserName(lead.assignedTo) || "Inconnu"}</span>
                      </div>
                    )}
                    {lead.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 italic line-clamp-2">💬 {lead.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenModal(lead)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit size={18} />
                    </button>
                    {(user?.role === "admin" || user?.role === "supervisor") && (
                      <>
                        <button
                          onClick={() => handleConvert(lead.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Convertir en client"
                        >
                          <UserCheck size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Create/Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingLead ? "Modifier le lead" : "Nouveau lead"}
                  </h2>
                  <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">Nouveau</option>
                      <option value="contacted">Contacté</option>
                      <option value="qualified">Qualifié</option>
                      <option value="converted">Converti</option>
                      <option value="lost">Perdu</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigné à</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Non assigné</option>
                      {operators.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.fullName || op.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

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
                      {editingLead ? "Mettre à jour" : "Créer"}
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

