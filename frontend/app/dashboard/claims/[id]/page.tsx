"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, Clock, CheckCircle, AlertCircle, X, Send, User, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface Comment {
  id: number;
  authorId: number | null;
  role: string;
  content: string;
  visibleToClient: boolean;
  createdAt: string;
}

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
  const { toast } = useToast();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = user?.role && ["admin", "supervisor", "operator"].includes(user.role);
  const canComment = canManage;

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
      setReplyText(data.reply || "");
      
      // Load comments
      if (canComment) {
        try {
          const commentsData = await api(`/api/claims/${params.id}/comments`);
          setComments(commentsData);
        } catch (error) {
          console.error("Error loading comments:", error);
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du chargement",
        variant: "destructive",
      });
      router.push("/dashboard/claims");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!newStatus || newStatus === claim?.status) return;

    try {
      setIsSubmitting(true);
      await api(`/api/claims/${params.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast({
        title: "Succès",
        description: `Statut changé en "${statusConfig[newStatus as keyof typeof statusConfig]?.label}"`,
      });
      loadClaim();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) {
      toast({
        title: "Erreur",
        description: "La réponse ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api(`/api/claims/${params.id}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ reply: replyText }),
      });
      toast({
        title: "Succès",
        description: "Réponse ajoutée avec succès",
      });
      loadClaim();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'envoi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) {
      toast({
        title: "Erreur",
        description: "Le commentaire ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api(`/api/claims/${params.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ 
          content: commentText,
          visibleToClient: false,
        }),
      });
      toast({
        title: "Succès",
        description: "Commentaire ajouté avec succès",
      });
      setCommentText("");
      loadClaim();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'envoi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!claim) {
    return null;
  }

  const status = statusConfig[claim.status];
  const StatusIcon = status.icon;

  return (
    <div className="container mx-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/claims"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Retour aux réclamations
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{claim.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={status.color}>
                <StatusIcon size={14} className="mr-1" />
                {status.label}
              </Badge>
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

        {/* Management Section */}
        {canManage && (
          <div className="border-t pt-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Gestion de la réclamation</h2>

            {/* Status Workflow */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Workflow de statut
              </label>
              <div className="flex flex-wrap gap-2">
                {claim.status === "submitted" && (
                  <Button
                    onClick={() => handleStatusChange("in_review")}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Passer en "En cours"
                  </Button>
                )}
                {claim.status === "in_review" && (
                  <>
                    <Button
                      onClick={() => handleStatusChange("resolved")}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Résoudre
                    </Button>
                    <Button
                      onClick={() => handleStatusChange("rejected")}
                      disabled={isSubmitting}
                      variant="destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Rejeter
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Reply */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Réponse officielle (visible par le client)
              </label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Écrivez votre réponse officielle ici..."
                rows={4}
                disabled={isSubmitting}
              />
              <Button
                onClick={handleReplySubmit}
                disabled={isSubmitting || !replyText.trim()}
                className="mt-2 bg-green-600 hover:bg-green-700"
              >
                <Send className="mr-2 h-4 w-4" />
                Envoyer la réponse
              </Button>
            </div>

            {/* Comments Section */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Commentaires internes</h3>
              </div>

              {/* Comments List */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun commentaire</p>
                ) : (
                  comments.map((comment) => (
                    <Card key={comment.id} className="bg-gray-50">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <Badge variant="outline">{comment.role}</Badge>
                            {comment.visibleToClient && (
                              <Badge variant="secondary" className="text-xs">Visible client</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div>
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Ajouter un commentaire interne..."
                  rows={3}
                  disabled={isSubmitting}
                  className="mb-2"
                />
                <Button
                  onClick={handleCommentSubmit}
                  disabled={isSubmitting || !commentText.trim()}
                  variant="outline"
                  size="sm"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Ajouter un commentaire
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

