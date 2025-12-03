"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { ArrowLeft, FileText, Clock, CheckCircle, AlertCircle, X, Send, User } from "lucide-react";
import Link from "next/link";

type Claim = {
  id: number;
  clientId: number;
  title: string;
  description: string;
  status: "submitted" | "in_review" | "resolved" | "rejected";
  reply: string | null;
  filePaths: string[] | null;
  assignedTo: number | null;
  createdAt: string;
  updatedAt: string;
};

const statusConfig = {
  submitted: {
    label: "Soumis",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  in_review: {
    label: "En cours",
    color: "bg-blue-100 text-blue-800",
    icon: AlertCircle,
  },
  resolved: {
    label: "Résolu",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejeté",
    color: "bg-red-100 text-red-800",
    icon: X,
  },
};

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [statusValue, setStatusValue] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = user?.role && ["admin", "supervisor", "operator"].includes(user.role);
  const canAssign = user?.role === "supervisor" || user?.role === "admin";

  useEffect(() => {
    if (params.id) {
      loadClaim();
    }
  }, [params.id]);

  const loadClaim = async () => {
    try {
      setLoading(true);
      const data = await api(`/api/claims/${params.id}`);
      setClaim(data);
      setStatusValue(data.status);
      setReplyText(data.reply || "");
    } catch (error: any) {
      toast(error.message || "Erreur lors du chargement", "error");
      router.push("/claims");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusValue || statusValue === claim?.status) return;

    try {
      setIsSubmitting(true);
      await api(`/api/claims/${params.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusValue }),
      });
      toast("Statut mis à jour avec succès", "success");
      loadClaim();
    } catch (error: any) {
      toast(error.message || "Erreur lors de la mise à jour", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) {
      toast("La réponse ne peut pas être vide", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      await api(`/api/claims/${params.id}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ reply: replyText }),
      });
      toast("Réponse ajoutée avec succès", "success");
      loadClaim();
    } catch (error: any) {
      toast(error.message || "Erreur lors de l'envoi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!claim) {
    return null;
  }

  const status = statusConfig[claim.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/claims"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Retour aux réclamations
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{claim.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}
                >
                  <StatusIcon size={14} />
                  {status.label}
                </span>
                <span className="text-sm text-gray-500">
                  Créé le {new Date(claim.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{claim.description}</p>
          </div>

          {/* Files */}
          {claim.filePaths && claim.filePaths.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Pièces jointes</h2>
              <div className="space-y-2">
                {claim.filePaths.map((file, idx) => (
                  <a
                    key={idx}
                    href={`http://localhost:3002${file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FileText size={16} className="text-gray-500" />
                    <span className="text-blue-600 hover:text-blue-800">
                      {file.split("/").pop()}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Reply */}
          {claim.reply && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Réponse</h2>
              <p className="text-blue-800 whitespace-pre-wrap">{claim.reply}</p>
              <p className="text-xs text-blue-600 mt-2">
                Mis à jour le {new Date(claim.updatedAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
          )}

          {/* Management Section (Admin/Supervisor/Operator) */}
          {canManage && (
            <div className="border-t pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Gestion de la réclamation</h2>

              {/* Status Change */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modifier le statut
                </label>
                <div className="flex gap-2">
                  <select
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  >
                    <option value="submitted">Soumis</option>
                    <option value="in_review">En cours</option>
                    <option value="resolved">Résolu</option>
                    <option value="rejected">Rejeté</option>
                  </select>
                  <button
                    onClick={handleStatusChange}
                    disabled={isSubmitting || statusValue === claim.status}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Mettre à jour
                  </button>
                </div>
              </div>

              {/* Reply */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ajouter une réponse
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Écrivez votre réponse ici..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  disabled={isSubmitting}
                />
                <button
                  onClick={handleReplySubmit}
                  disabled={isSubmitting || !replyText.trim()}
                  className="mt-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={16} />
                  Envoyer la réponse
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

