// backend/src/multer.ts
import multer from "multer";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = join(process.cwd(), "uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique : timestamp-random-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split(".").pop();
    cb(null, `claim-${uniqueSuffix}.${ext}`);
  },
});

// Filtre des types de fichiers autorisés
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Type de fichier non autorisé. Formats acceptés: PDF, JPG, PNG"));
  }
};

// Configuration multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Mo max par fichier
    files: 10, // Max 10 fichiers
  },
});

// Middleware pour Hono (wrapper autour de multer)
export const multerMiddleware = (uploadInstance: multer.Multer) => {
  return async (c: any, next: any) => {
    return new Promise((resolve, reject) => {
      uploadInstance.array("files", 10)(c.req.raw as any, {} as any, (err: any) => {
        if (err) {
          return reject(err);
        }
        resolve(next());
      });
    });
  };
};

