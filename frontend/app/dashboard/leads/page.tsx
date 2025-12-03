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
import { Plus, Edit, Trash2, UserCheck, Loader2, X } from "lucide-react";

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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        </div>
      </div>
    );
  }

  const operators = users.filter((u) => u.role === "operator" || u.role === "admin" || u.role === "supervisor");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Leads</h1>
            <p className="text-gray-600 mt-2">Gérez vos prospects et convertissez-les en clients</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nouveau lead
          </button>
        </div>

        {leads.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">Aucun lead pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{lead.name}</CardTitle>
                        <Badge variant="outline">{lead.status}</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        {lead.email && <p>📧 {lead.email}</p>}
                        {lead.phone && <p>📞 {lead.phone}</p>}
                        {lead.assignedTo && (
                          <p>👤 Assigné à : {getAssignedUserName(lead.assignedTo) || "Inconnu"}</p>
                        )}
                        {lead.notes && <p className="mt-2 italic">💬 {lead.notes}</p>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(lead)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit size={18} />
                    </button>
                    {(user?.role === "admin" || user?.role === "supervisor") && (
                      <>
                        <button
                          onClick={() => handleConvert(lead.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Convertir en client"
                        >
                          <UserCheck size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="text-red-600 hover:text-red-900"
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

