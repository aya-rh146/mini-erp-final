// backend/src/upload.ts
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = join(process.cwd(), "uploads");

export async function ensureUploadsDir() {
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }
}

export interface UploadedFile {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

/**
 * Traite les fichiers uploadés depuis FormData
 * @param formData - FormData de la requête
 * @param fieldName - Nom du champ contenant les fichiers (défaut: "files")
 * @returns Tableau des fichiers uploadés
 */
export async function handleFileUpload(
  formData: FormData,
  fieldName: string = "files"
): Promise<UploadedFile[]> {
  await ensureUploadsDir();

  const uploadedFiles: UploadedFile[] = [];
  const files = formData.getAll(fieldName) as File[];

  // Types de fichiers autorisés
  const allowedMimes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const maxFileSize = 20 * 1024 * 1024; // 20 Mo

  // Limite du nombre de fichiers
  const maxFiles = 20;
  if (files.length > maxFiles) {
    throw new Error(`Maximum ${maxFiles} fichiers autorisés`);
  }

  for (const file of files) {
    // Vérifier le type MIME
    if (!allowedMimes.includes(file.type)) {
      throw new Error(
        `Type de fichier non autorisé: ${file.name}. Formats acceptés: PDF, JPG, PNG`
      );
    }

    // Vérifier la taille
    if (file.size > maxFileSize) {
      throw new Error(`Fichier trop volumineux: ${file.name}. Maximum: 20 Mo`);
    }

    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.name.split(".").pop() || "";
    const filename = `claim-${uniqueSuffix}.${ext}`;
    const filePath = join(uploadsDir, filename);

    // Convertir le fichier en buffer et l'écrire
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    uploadedFiles.push({
      filename: file.name,
      path: `/uploads/${filename}`, // Chemin relatif pour l'API
      size: file.size,
      mimetype: file.type,
    });
  }

  return uploadedFiles;
}

