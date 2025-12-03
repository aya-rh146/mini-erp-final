"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { ArrowLeft, Upload, FileText, X, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateClaimPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<Array<{ id: number; email: string; fullName: string | null }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const isAdminOrSupervisor = user?.role === "admin" || user?.role === "supervisor";

  // Charger la liste des clients si admin/supervisor
  useEffect(() => {
    if (isAdminOrSupervisor) {
      loadClients();
    }
  }, [isAdminOrSupervisor]);

  const loadClients = async () => {
    try {
      const data = await api("/api/users");
      const clientList = data.filter((u: any) => u.role === "client" && u.active);
      setClients(clientList);
    } catch (error: any) {
      console.error("Error loading clients:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Vérifier le nombre de fichiers
    if (files.length + selectedFiles.length > 20) {
      setError("Maximum 20 fichiers autorisés");
      return;
    }

    // Vérifier la taille et le type de chaque fichier
    const validFiles: File[] = [];
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    const maxSize = 300 * 1024 * 1024; // 100 Mo (augmenté de 20 Mo)

    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        setError(`Type de fichier non autorisé: ${file.name}. Formats acceptés: PDF, JPG, PNG`);
        continue;
      }
      if (file.size > maxSize) {
        setError(`Fichier trop volumineux: ${file.name}. Maximum: 300 Mo`);
        continue;
      }
      validFiles.push(file);
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Le titre est obligatoire");
      return;
    }

    if (!description.trim()) {
      setError("La description est obligatoire");
      return;
    }

    // Vérifier que le client est sélectionné si admin/supervisor
    if (isAdminOrSupervisor && !selectedClientId) {
      setError("Veuillez sélectionner un client");
      return;
    }

    setIsSubmitting(true);

    try {
      // Créer FormData pour l'upload
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      
      // Si admin/supervisor, ajouter le clientId
      if (isAdminOrSupervisor && selectedClientId) {
        formData.append("clientId", selectedClientId);
      }
      
      // Ajouter les fichiers
      files.forEach((file) => {
        formData.append("files", file);
      });

      // Envoyer la requête
      const response = await fetch("http://localhost:3002/api/claims", {
        method: "POST",
        credentials: "include", // Important pour les cookies
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la création");
      }

      const data = await response.json();
      
      // Rediriger vers la liste des réclamations
      router.push("/claims");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de la réclamation");
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/claims"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Retour aux réclamations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Créer une nouvelle réclamation
          </h1>
          <p className="text-gray-600 mt-2">
            Remplissez le formulaire ci-dessous pour soumettre une réclamation
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Titre de la réclamation <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Problème avec le produit X"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description détaillée <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre problème en détail..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Client Selection (Admin/Supervisor only) */}
          {isAdminOrSupervisor && (
            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                id="clientId"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              >
                <option value="">Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.fullName || client.email} ({client.email})
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Aucun client disponible. Créez d'abord un client dans la section Utilisateurs.
                </p>
              )}
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pièces jointes (PDF, JPG, PNG)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                type="file"
                id="file-upload"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                disabled={isSubmitting || files.length >= 20}
              />
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center cursor-pointer ${
                  isSubmitting || files.length >= 20
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                }`}
              >
                <Upload size={32} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  Cliquez pour sélectionner des fichiers ou glissez-déposez
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum 20 fichiers, 20 Mo par fichier
                </p>
              </label>

              {/* Liste des fichiers */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Fichiers sélectionnés ({files.length}/20):
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                      >
                        <FileText size={16} className="text-gray-500" />
                        <span className="text-gray-700 truncate flex-1">
                          {file.name}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {formatFileSize(file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                          disabled={isSubmitting}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Formats acceptés: PDF, JPG, PNG (max 20MB par fichier, 20 fichiers max)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                "Créer la réclamation"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
