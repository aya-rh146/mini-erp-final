"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  User, 
  Loader2 
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function StaffClaimsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [claims, setClaims] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClaims = async () => {
    try {
      const data = await api("/api/claims");
      setClaims(data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading claims:", error);
    }
  };

  const loadOperators = async () => {
    try {
      const users = await api("/api/users");
      const ops = users.filter((u: any) => 
        ["admin", "supervisor", "operator"].includes(u.role) && u.active
      );
      setOperators(ops);
    } catch (error) {
      console.error("Error loading operators:", error);
    }
  };

  useEffect(() => {
    loadClaims();
    if (user?.role === "admin" || user?.role === "supervisor") {
      loadOperators();
    }
  }, [user]);

  const canCreate = user?.role === "client";
  const canAssign = user?.role === "admin" || user?.role === "supervisor";
  const canManage = user?.role && ["admin", "supervisor", "operator"].includes(user.role);

  const statusConfig: any = {
    submitted: { 
      label: "Soumis", 
      color: "bg-yellow-100 text-yellow-800", 
      icon: Clock,
      next: ["in_review"]
    },
    in_review: { 
      label: "En cours", 
      color: "bg-blue-100 text-blue-800", 
      icon: AlertCircle,
      next: ["resolved", "rejected"]
    },
    resolved: { 
      label: "Résolu", 
      color: "bg-green-100 text-green-800", 
      icon: CheckCircle,
      next: []
    },
    rejected: { 
      label: "Rejeté", 
      color: "bg-red-100 text-red-800", 
      icon: XCircle,
      next: []
    },
  };

  const [isAssigning, setIsAssigning] = useState<Record<number, boolean>>({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<Record<number, boolean>>({});

  const handleAssign = async (claimId: number, assignedTo: string | null) => {
    try {
      setIsAssigning(prev => ({ ...prev, [claimId]: true }));
      
      // Valider que l'ID est valide
      if (assignedTo && isNaN(parseInt(assignedTo))) {
        throw new Error("ID d'opérateur invalide");
      }

      const response = await api(`/api/claims/${claimId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ 
          assignedTo: assignedTo ? parseInt(assignedTo) : null 
        }),
      });

      toast({
        title: "Succès",
        description: "Réclamation assignée avec succès",
      });
      
      // Recharger les réclamations
      await loadClaims();
    } catch (error: any) {
      console.error('Erreur lors de l\'assignation:', error);
      
      // Vérifier si c'est une erreur de connexion
      const errorMessage = error.message.includes('Failed to fetch') || 
                         error.message.includes('Impossible de se connecter')
        ? "Impossible de se connecter au serveur. Vérifiez votre connexion et que le serveur est démarré."
        : error.message || "Une erreur est survenue lors de l'assignation";
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAssigning(prev => ({ ...prev, [claimId]: false }));
    }
  };

  const handleStatusChange = async (claimId: number, newStatus: string) => {
    try {
      setIsUpdatingStatus(prev => ({ ...prev, [claimId]: true }));
      
      const response = await api(`/api/claims/${claimId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      toast({
        title: "Succès",
        description: `Statut changé en "${statusConfig[newStatus]?.label}"`,
      });
      
      // Recharger les réclamations
      await loadClaims();
    } catch (error: any) {
      console.error('Erreur lors du changement de statut:', error);
      
      // Vérifier si c'est une erreur de connexion
      const errorMessage = error.message.includes('Failed to fetch') || 
                         error.message.includes('Impossible de se connecter')
        ? "Impossible de se connecter au serveur. Vérifiez votre connexion et que le serveur est démarré."
        : error.message || "Une erreur est survenue lors du changement de statut";
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(prev => ({ ...prev, [claimId]: false }));
    }
  };

  const getOperatorName = (operatorId: number | null) => {
    if (!operatorId) return "Non assigné";
    const op = operators.find((o: any) => o.id === operatorId);
    return op ? (op.fullName || op.email) : "Inconnu";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Réclamations</h1>
          <p className="text-gray-600 mt-1">
            Gérez toutes les réclamations soumises par les clients
          </p>
        </div>

        {canCreate && (
          <Link href="/claims/new">
            <Button>
              <Plus className="mr-2 h-5 w-5" />
              Nouvelle réclamation
            </Button>
          </Link>
        )}
      </div>

      {claims.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Aucune réclamation trouvée</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                {canAssign && <TableHead>Assigné à</TableHead>}
                {canAssign && <TableHead>Assigner</TableHead>}
                {canManage && <TableHead>Actions</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim: any) => {
                const StatusIcon = statusConfig[claim.status]?.icon || FileText;
                const nextStatuses = statusConfig[claim.status]?.next || [];
                
                return (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">
                      <div className="max-w-xs truncate">{claim.title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[claim.status]?.color}>
                        <StatusIcon size={12} className="mr-1" />
                        {statusConfig[claim.status]?.label}
                      </Badge>
                    </TableCell>
                    {canAssign && (
                      <TableCell className="text-sm text-gray-600">
                        {getOperatorName(claim.assignedTo)}
                      </TableCell>
                    )}
                    {canAssign && (
                      <TableCell>
                        <div className="relative">
                          <Select
                            value={claim.assignedTo?.toString() || ""}
                            onValueChange={(value) => handleAssign(claim.id, value || null)}
                            disabled={isAssigning[claim.id]}
                          >
                            <SelectTrigger className="w-48">
                              {isAssigning[claim.id] ? (
                                <span className="flex items-center">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Chargement...
                                </span>
                              ) : (
                                <SelectValue placeholder="Assigner..." />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Non assigné</SelectItem>
                              {operators.map((op: any) => (
                                <SelectItem key={op.id} value={op.id.toString()}>
                                  {op.fullName || op.email} ({op.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    )}
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {nextStatuses.map((nextStatus: string) => {
                            const isProcessing = isUpdatingStatus[claim.id];
                            return (
                              <Button
                                key={nextStatus}
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(claim.id, nextStatus)}
                                className="text-xs min-w-[100px]"
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    {statusConfig[nextStatus]?.label}...
                                  </>
                                ) : (
                                  statusConfig[nextStatus]?.label
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-gray-500">
                      {new Date(claim.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/claims/${claim.id}`}>
                        <Button variant="ghost" size="sm">
                          Voir détails
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
