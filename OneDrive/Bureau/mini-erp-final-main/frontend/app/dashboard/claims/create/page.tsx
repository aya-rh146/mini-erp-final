"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadButton } from "@/lib/uploadthing";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { ArrowLeft, Upload, FileText, X } from "lucide-react";
import Link from "next/link";

export default function CreateClaimPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast("Le titre est obligatoire", "error");
      return;
    }

    if (!description.trim()) {
      toast("La description est obligatoire", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api("/api/claims", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          files: files,
        }),
      });

      toast("Réclamation créée avec succès !", "success");
      setTimeout(() => {
        router.push("/dashboard/claims");
      }, 1500);
    } catch (error: any) {
      toast(error.message || "Erreur lors de la création de la réclamation", "error");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/claims"
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
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pièces jointes (PDF, JPG, PNG)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <UploadButton
                endpoint="claimFiles"
                onClientUploadComplete={(res) => {
                  if (res) {
                    const uploadedFiles = res.map((file) => file.url);
                    setFiles((prev) => [...prev, ...uploadedFiles]);
                    toast(`${res.length} fichier(s) uploadé(s) avec succès`, "success");
                  }
                }}
                onUploadError={(error: Error) => {
                  toast(`Erreur lors de l'upload: ${error.message}`, "error");
                }}
                appearance={{
                  button: "ut-ready:bg-blue-600 ut-uploading:cursor-not-allowed rounded-lg px-4 py-2 bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors",
                  allowedContent: "text-sm text-gray-500 mt-2",
                }}
              />
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Fichiers uploadés ({files.length}):
                  </p>
                  <div className="space-y-1">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                      >
                        <FileText size={16} className="text-gray-500" />
                        <span className="text-gray-700 truncate flex-1">
                          {file.split("/").pop()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700"
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
              Formats acceptés: PDF, JPG, PNG (max 4MB par fichier, 5 fichiers max)
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
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Envoi en cours..." : "Créer la réclamation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

