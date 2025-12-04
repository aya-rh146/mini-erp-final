"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { ArrowLeft, Upload, FileText, X, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateClaimPage() {
  const router = useRouter();
  const { user } = useAuth();

  // تحويل فوري إذا ما كانش كلاينت
  useEffect(() => {
    if (user && user.role !== "client") {
      toast("Accès refusé. Seuls les clients peuvent créer des réclamations.", "error");
      router.replace("/dashboard");
    }
  }, [user, router]);

  // إذا ما كانش كلاينت → ما يشوف والو
  if (!user || user.role !== "client") {
    return null;
  }

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // باقي الكود ديال الفايلز والرفع (نفس اللي عندك)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* نفس الكود */ };
  const removeFile = (index: number) => { /* نفس الكود */ };
  const formatFileSize = (bytes: number) => { /* نفس الكود */ };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Le titre et la description sont obligatoires");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("http://localhost:3002/api/claims", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la création");
      }

      toast("Réclamation créée avec succès !", "success");
      setTimeout(() => router.push("/claims"), 1500);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/claims" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft size={20} />
            Retour aux réclamations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Créer une nouvelle réclamation</h1>
          <p className="text-gray-600 mt-2">Remplissez le formulaire ci-dessous pour soumettre une réclamation</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">{error}</div>}

          {/* الحقول العادية بدون اختيار الكلاينت */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre de la réclamation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Problème avec le produit X"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description détaillée <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* نفس جزء رفع الملفات */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pièces jointes (PDF, JPG, PNG)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input type="file" id="file-upload" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                <Upload size={32} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 text-center">Cliquez ou glissez-déposez</p>
                <p className="text-xs text-gray-500 mt-1">Maximum 20 fichiers, 20 Mo par fichier</p>
              </label>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Fichiers sélectionnés ({files.length}/20):</p>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                      <FileText size={16} className="text-gray-500" />
                      <span className="text-gray-700 truncate flex-1">{file.name}</span>
                      <span className="text-gray-500 text-xs">{formatFileSize(file.size)}</span>
                      <button type="button" onClick={() => removeFile(index)} className="text-red-500">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => router.back()} className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50" disabled={isSubmitting}>
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Envoi...</> : "Créer la réclamation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}