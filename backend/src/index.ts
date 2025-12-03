// backend/src/index.ts
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { users, claims } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { handleFileUpload } from "./upload";
import { serveStatic } from "@hono/node-server/serve-static";

const app = new Hono();

// ==================== DATABASE ====================
if (!process.env.DATABASE_URL) {
  console.error("❌ ERREUR: DATABASE_URL n'est pas défini dans .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const db = drizzle(pool);

// Test de connexion au démarrage
pool.on("error", (err: Error) => {
  console.error("❌ Erreur de connexion à la base de données:", err);
});

pool.on("connect", () => {
  console.log("✅ Connexion à la base de données établie");
});

const JWT_SECRET = process.env.JWT_SECRET || "mini_erp_2025_super_long_secret_123456789_abcxyz";

// ==================== TYPES ====================
type UserRole = "admin" | "supervisor" | "operator" | "client";
type JWTPayload = { id: number; role: UserRole; name: string | null; email: string };

// ==================== MIDDLEWARES ====================

/**
 * Middleware d'authentification
 * Vérifie le token JWT dans les cookies et charge l'utilisateur
 */
const authenticate = async (c: any, next: any) => {
  const cookie = c.req.header("Cookie") || "";
  const token = cookie.match(/token=([^;]+)/)?.[1];

  if (!token) {
    return c.json({ error: "Unauthorized – no token" }, 401);
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Vérifier que l'utilisateur existe toujours et est actif
    const userResult = await db
      .select()
      .from(users)
      .where(and(eq(users.id, payload.id), eq(users.active, true)))
      .limit(1);
    
    if (userResult.length === 0) {
      return c.json({ error: "User not found or inactive" }, 401);
    }

    const user = userResult[0];
    
    // Mettre à jour le payload avec les données réelles de la DB
    c.set("user", {
      id: user.id,
      role: user.role as UserRole,
      name: user.fullName,
      email: user.email,
    });
    
    await next();
  } catch (error) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
};

/**
 * Middleware pour vérifier un rôle spécifique
 * @param allowedRoles - Tableau des rôles autorisés
 */
const requireRole = (allowedRoles: UserRole[]) => {
  return async (c: any, next: any) => {
    const user = c.get("user");
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    if (!allowedRoles.includes(user.role)) {
      return c.json({ 
        error: `Forbidden – Required roles: ${allowedRoles.join(", ")}` 
      }, 403);
    }
    
    await next();
  };
};

// Middlewares spécifiques pour chaque rôle
const requireAdmin = requireRole(["admin"]);
const requireSupervisor = requireRole(["admin", "supervisor"]);
const requireOperator = requireRole(["admin", "supervisor", "operator"]);
const requireClient = requireRole(["client"]);

// ==================== CORS ====================
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Cookie"],
  })
);

// ==================== ROUTES PUBLIQUES ====================

// Test
app.get("/", (c) => c.text("Mini ERP API – 100% KHADDAM !"));

// Test de connexion DB
app.get("/api/test-db", async (c) => {
  try {
    const result = await db.select().from(users).limit(1);
    return c.json({ 
      success: true, 
      message: "Connexion DB OK",
      userCount: result.length,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    });
  } catch (error: any) {
    const pgErrorCode = error?.code || error?.cause?.code;
    let errorMessage = error.message;
    let hint = undefined;
    
    if (pgErrorCode === "42P01" || error?.message?.includes("relation") || error?.message?.includes("does not exist")) {
      errorMessage = "Les tables de la base de données n'existent pas";
      hint = "Exécutez 'npm run migrate' dans le dossier backend pour créer les tables.";
    } else if (pgErrorCode === "28P01" || error?.message?.includes("password authentication failed")) {
      errorMessage = "Erreur d'authentification à la base de données";
      hint = "Vérifiez que DATABASE_URL dans le fichier .env contient les bons identifiants.";
    } else if (pgErrorCode === "ECONNREFUSED" || pgErrorCode === "ENOTFOUND") {
      errorMessage = "Impossible de se connecter à la base de données";
      hint = "Vérifiez que DATABASE_URL est correct et que la base de données est accessible.";
    }
    
    return c.json({ 
      success: false, 
      error: errorMessage,
      code: pgErrorCode,
      hint: hint,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    }, 500);
  }
});

// Initialisation : Créer l'admin par défaut (une seule fois)
app.post("/api/init", async (c) => {
  try {
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    
    if (existingAdmin.length > 0) {
      return c.json({ 
        success: false, 
        message: "Un administrateur existe déjà. Utilisez /api/auth/login pour vous connecter." 
      }, 400);
    }

    const defaultPassword = "password";
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    
    const newAdmin = await db
      .insert(users)
      .values({
        email: "admin@erp.com",
        password: hashedPassword,
        fullName: "Administrateur",
        role: "admin",
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      });

    return c.json({
      success: true,
      message: "Administrateur créé avec succès",
      user: newAdmin[0],
      credentials: {
        email: "admin@erp.com",
        password: defaultPassword,
      },
    });
  } catch (error: any) {
    console.error("Init error:", error);
    return c.json({ 
      success: false,
      error: error.message,
      code: error.code,
      hint: error.code === "42P01" ? "La table 'users' n'existe pas. Exécutez 'npm run migrate' dans le dossier backend." : undefined
    }, 500);
  }
});

// ==================== AUTHENTIFICATION ====================

/**
 * POST /api/auth/login
 * Authentifie un utilisateur et retourne un JWT dans un cookie HttpOnly
 */
app.post("/api/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email et mot de passe obligatoires" }, 400);
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    const user = result[0];

    if (!user) {
      return c.json({ error: "Email ou mot de passe incorrect" }, 401);
    }

    // Vérifier si l'utilisateur est actif
    if (!user.active) {
      return c.json({ error: "Compte désactivé" }, 403);
    }

    // Vérifier le mot de passe
    if (!bcrypt.compareSync(password, user.password)) {
      return c.json({ error: "Email ou mot de passe incorrect" }, 401);
    }

    // Générer le token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        name: user.fullName,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Définir le cookie HttpOnly
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${isProduction ? "; Secure" : ""}`;
    c.header("Set-Cookie", cookieOptions);

    return c.json({
      success: true,
      user: { 
        id: user.id, 
        role: user.role, 
        name: user.fullName,
        email: user.email 
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    
    let errorMessage = "Erreur serveur lors de la connexion";
    let hint = undefined;
    const pgErrorCode = error?.code || error?.cause?.code;
    
    if (pgErrorCode === "42P01") {
      errorMessage = "La table 'users' n'existe pas dans la base de données";
      hint = "Exécutez 'npm run migrate' dans le dossier backend pour créer les tables.";
    } else if (pgErrorCode === "28P01" || error?.message?.includes("password authentication failed")) {
      errorMessage = "Erreur d'authentification à la base de données";
      hint = "Vérifiez que DATABASE_URL dans le fichier .env contient les bons identifiants.";
    } else if (pgErrorCode === "ECONNREFUSED" || pgErrorCode === "ENOTFOUND") {
      errorMessage = "Impossible de se connecter à la base de données";
      hint = "Vérifiez que DATABASE_URL est correct dans le fichier .env et que la base de données Neon est active.";
    }
    
    return c.json({ 
      error: errorMessage,
      hint: hint,
      code: pgErrorCode,
      details: process.env.NODE_ENV === "development" ? error?.message : undefined
    }, 500);
  }
});

/**
 * POST /api/auth/logout
 * Déconnecte l'utilisateur en supprimant le cookie
 */
app.post("/api/auth/logout", authenticate, async (c) => {
  c.header("Set-Cookie", "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  return c.json({ success: true, message: "Déconnecté avec succès" });
});

/**
 * GET /api/me
 * Retourne les informations de l'utilisateur connecté
 */
app.get("/api/me", authenticate, async (c: any) => {
  const user = c.get("user");
  return c.json(user);
});

// ==================== GESTION DES UTILISATEURS (ADMIN ONLY) ====================

/**
 * GET /api/users
 * Liste tous les utilisateurs (admin et supervisor)
 */
app.get("/api/users", authenticate, requireSupervisor, async (c) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        supervisorId: users.supervisorId,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    return c.json(allUsers);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/users/:id
 * Récupère un utilisateur par ID (admin only)
 */
app.get("/api/users/:id", authenticate, requireAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    
    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        supervisorId: users.supervisorId,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    return c.json(result[0]);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/users
 * Crée un nouvel utilisateur (admin only)
 */
app.post("/api/users", authenticate, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();

    if (!body.email || !body.password) {
      return c.json({ error: "Email et mot de passe obligatoires" }, 400);
    }

    // Valider le rôle
    const validRoles: UserRole[] = ["admin", "supervisor", "operator", "client"];
    if (body.role && !validRoles.includes(body.role)) {
      return c.json({ 
        error: `Rôle invalide. Rôles autorisés: ${validRoles.join(", ")}` 
      }, 400);
    }

    // Hasher le mot de passe
    const hashedPassword = bcrypt.hashSync(body.password, 10);

    const newUser = await db
      .insert(users)
      .values({
        email: body.email,
        password: hashedPassword,
        fullName: body.fullName ?? null,
        role: (body.role as UserRole) ?? "client",
        supervisorId: body.supervisorId ? parseInt(body.supervisorId) : null,
        active: body.active !== undefined ? body.active : true,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        supervisorId: users.supervisorId,
        active: users.active,
        createdAt: users.createdAt,
      });

    return c.json(newUser[0], 201);
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === "23505") {
      return c.json({ error: "Cet email existe déjà" }, 409);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * PUT /api/users/:id
 * Met à jour un utilisateur (admin only)
 */
app.put("/api/users/:id", authenticate, requireAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    
    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const body = await c.req.json();

    // Vérifier que l'utilisateur existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    // Préparer les données de mise à jour
    const updateData: any = {};
    
    if (body.email !== undefined) updateData.email = body.email;
    if (body.fullName !== undefined) updateData.fullName = body.fullName;
    if (body.role !== undefined) {
      const validRoles: UserRole[] = ["admin", "supervisor", "operator", "client"];
      if (!validRoles.includes(body.role)) {
        return c.json({ 
          error: `Rôle invalide. Rôles autorisés: ${validRoles.join(", ")}` 
        }, 400);
      }
      updateData.role = body.role;
    }
    if (body.supervisorId !== undefined) {
      updateData.supervisorId = body.supervisorId ? parseInt(body.supervisorId) : null;
    }
    if (body.active !== undefined) updateData.active = body.active;
    
    // Si un nouveau mot de passe est fourni, le hasher
    if (body.password) {
      updateData.password = bcrypt.hashSync(body.password, 10);
    }

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        supervisorId: users.supervisorId,
        active: users.active,
        createdAt: users.createdAt,
      });

    return c.json(updatedUser[0]);
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error.code === "23505") {
      return c.json({ error: "Cet email existe déjà" }, 409);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * DELETE /api/users/:id
 * Supprime un utilisateur (admin only)
 */
app.delete("/api/users/:id", authenticate, requireAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    
    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    // Vérifier que l'utilisateur existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    // Empêcher la suppression de l'admin si c'est le seul
    if (existingUser[0].role === "admin") {
      const adminCount = await db
        .select()
        .from(users)
        .where(eq(users.role, "admin"));
      
      if (adminCount.length <= 1) {
        return c.json({ 
          error: "Impossible de supprimer le dernier administrateur" 
        }, 400);
      }
    }

    // Supprimer l'utilisateur
    await db.delete(users).where(eq(users.id, id));

    return c.json({ success: true, message: "Utilisateur supprimé avec succès" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// ==================== SERVEUR DE FICHIERS STATIQUES ====================
// Servir les fichiers uploadés
app.use("/uploads/*", serveStatic({ root: "./" }));

// ==================== ROUTES PROTÉGÉES (CLAIMS) ====================

/**
 * POST /api/claims
 * Crée une nouvelle réclamation avec upload de fichiers
 * - Client : crée pour lui-même
 * - Admin/Supervisor : peut créer pour un client spécifique
 */
app.post("/api/claims", authenticate, async (c: any) => {
  try {
    const user = c.get("user");
    const formData = await c.req.formData();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const clientIdParam = formData.get("clientId") as string | null;

    if (!title || !description) {
      return c.json({ error: "Titre et description obligatoires" }, 400);
    }

    // Déterminer le clientId
    let clientId: number;
    const allowedRoles: UserRole[] = ["admin", "supervisor"];
    
    if (allowedRoles.includes(user.role) && clientIdParam) {
      // Admin/Supervisor peut créer pour un client spécifique
      clientId = parseInt(clientIdParam);
      if (isNaN(clientId)) {
        return c.json({ error: "ID client invalide" }, 400);
      }
      
      // Vérifier que le client existe et est bien un client
      const clientUser = await db
        .select()
        .from(users)
        .where(and(eq(users.id, clientId), eq(users.role, "client")))
        .limit(1);
      
      if (clientUser.length === 0) {
        return c.json({ error: "Client non trouvé" }, 404);
      }
    } else if (user.role === "client") {
      // Client crée pour lui-même
      clientId = user.id;
    } else {
      return c.json({ error: "Seuls les clients peuvent créer des réclamations. Les admins/supervisors doivent spécifier un clientId." }, 403);
    }

    // Traiter les fichiers uploadés
    let filePaths: string[] = [];
    try {
      const uploadedFiles = await handleFileUpload(formData, "files");
      filePaths = uploadedFiles.map((f) => f.path);
    } catch (uploadError: any) {
      return c.json({ error: uploadError.message }, 400);
    }

    // Créer la réclamation
    const newClaim = await db
      .insert(claims)
      .values({
        clientId: clientId,
        title: title.trim(),
        description: description.trim(),
        filePaths: filePaths,
        status: "submitted",
      })
      .returning({
        id: claims.id,
        clientId: claims.clientId,
        title: claims.title,
        description: claims.description,
        status: claims.status,
        reply: claims.reply,
        filePaths: claims.filePaths,
        assignedTo: claims.assignedTo,
        createdAt: claims.createdAt,
        updatedAt: claims.updatedAt,
      });

    return c.json(newClaim[0], 201);
  } catch (error: any) {
    console.error("Error creating claim:", error);
    return c.json({ error: "Erreur serveur lors de la création" }, 500);
  }
});

/**
 * GET /api/claims
 * Liste les réclamations (admin voit tout, client voit seulement les siennes)
 */
app.get("/api/claims", authenticate, async (c: any) => {
  try {
    const user = c.get("user");
    const allowedRoles: UserRole[] = ["admin", "supervisor", "operator"];

    let result;
    if (allowedRoles.includes(user.role)) {
      // Admin, supervisor et operator voient toutes les réclamations
      result = await db
        .select({
          id: claims.id,
          clientId: claims.clientId,
          title: claims.title,
          description: claims.description,
          status: claims.status,
          reply: claims.reply,
          filePaths: claims.filePaths,
          assignedTo: claims.assignedTo,
          createdAt: claims.createdAt,
          updatedAt: claims.updatedAt,
        })
        .from(claims)
        .orderBy(desc(claims.createdAt));
    } else {
      // Client voit seulement ses propres réclamations
      result = await db
        .select({
          id: claims.id,
          clientId: claims.clientId,
          title: claims.title,
          description: claims.description,
          status: claims.status,
          reply: claims.reply,
          filePaths: claims.filePaths,
          assignedTo: claims.assignedTo,
          createdAt: claims.createdAt,
          updatedAt: claims.updatedAt,
        })
        .from(claims)
        .where(eq(claims.clientId, user.id))
        .orderBy(desc(claims.createdAt));
    }

    return c.json(result);
  } catch (error: any) {
    console.error("Error fetching claims:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/claims/:id
 * Récupère une réclamation par ID
 */
app.get("/api/claims/:id", authenticate, async (c: any) => {
  try {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const result = await db
      .select({
        id: claims.id,
        clientId: claims.clientId,
        title: claims.title,
        description: claims.description,
        status: claims.status,
        reply: claims.reply,
        filePaths: claims.filePaths,
        assignedTo: claims.assignedTo,
        createdAt: claims.createdAt,
        updatedAt: claims.updatedAt,
      })
      .from(claims)
      .where(eq(claims.id, id))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: "Réclamation non trouvée" }, 404);
    }

    const claim = result[0];

    // Vérifier les permissions : client ne peut voir que ses propres réclamations
    const allowedRoles: UserRole[] = ["admin", "supervisor", "operator"];
    if (!allowedRoles.includes(user.role) && claim.clientId !== user.id) {
      return c.json({ error: "Accès refusé" }, 403);
    }

    return c.json(claim);
  } catch (error: any) {
    console.error("Error fetching claim:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * PATCH /api/claims/:id/status
 * Met à jour le statut d'une réclamation (admin/supervisor/operator)
 */
app.patch("/api/claims/:id/status", authenticate, requireOperator, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const validStatuses = ["submitted", "in_review", "resolved", "rejected"];
    if (!body.status || !validStatuses.includes(body.status)) {
      return c.json(
        { error: `Statut invalide. Statuts autorisés: ${validStatuses.join(", ")}` },
        400
      );
    }

    // Vérifier que la réclamation existe
    const existingClaim = await db
      .select()
      .from(claims)
      .where(eq(claims.id, id))
      .limit(1);

    if (existingClaim.length === 0) {
      return c.json({ error: "Réclamation non trouvée" }, 404);
    }

    const updatedClaim = await db
      .update(claims)
      .set({
        status: body.status as any,
        updatedAt: new Date(),
      })
      .where(eq(claims.id, id))
      .returning({
        id: claims.id,
        clientId: claims.clientId,
        title: claims.title,
        description: claims.description,
        status: claims.status,
        reply: claims.reply,
        filePaths: claims.filePaths,
        assignedTo: claims.assignedTo,
        createdAt: claims.createdAt,
        updatedAt: claims.updatedAt,
      });

    return c.json(updatedClaim[0]);
  } catch (error: any) {
    console.error("Error updating claim status:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * PATCH /api/claims/:id/reply
 * Ajoute ou met à jour la réponse à une réclamation (admin/supervisor/operator)
 */
app.patch("/api/claims/:id/reply", authenticate, requireOperator, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    if (!body.reply || typeof body.reply !== "string") {
      return c.json({ error: "Réponse obligatoire" }, 400);
    }

    // Vérifier que la réclamation existe
    const existingClaim = await db
      .select()
      .from(claims)
      .where(eq(claims.id, id))
      .limit(1);

    if (existingClaim.length === 0) {
      return c.json({ error: "Réclamation non trouvée" }, 404);
    }

    const updatedClaim = await db
      .update(claims)
      .set({
        reply: body.reply.trim(),
        updatedAt: new Date(),
      })
      .where(eq(claims.id, id))
      .returning({
        id: claims.id,
        clientId: claims.clientId,
        title: claims.title,
        description: claims.description,
        status: claims.status,
        reply: claims.reply,
        filePaths: claims.filePaths,
        assignedTo: claims.assignedTo,
        createdAt: claims.createdAt,
        updatedAt: claims.updatedAt,
      });

    return c.json(updatedClaim[0]);
  } catch (error: any) {
    console.error("Error updating claim reply:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * PATCH /api/claims/:id/assign
 * Assigne une réclamation à un opérateur (supervisor only)
 */
app.patch("/api/claims/:id/assign", authenticate, requireSupervisor, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    if (body.assignedTo === undefined) {
      return c.json({ error: "assignedTo est obligatoire" }, 400);
    }

    const assignedToId = body.assignedTo ? parseInt(body.assignedTo) : null;

    // Si un ID est fourni, vérifier que l'utilisateur existe et est un opérateur
    if (assignedToId) {
      if (isNaN(assignedToId)) {
        return c.json({ error: "ID d'assignation invalide" }, 400);
      }

      const assignedUser = await db
        .select()
        .from(users)
        .where(and(eq(users.id, assignedToId), eq(users.active, true)))
        .limit(1);

      if (assignedUser.length === 0) {
        return c.json({ error: "Utilisateur assigné non trouvé ou inactif" }, 404);
      }

      const userRole = assignedUser[0].role;
      if (!["admin", "supervisor", "operator"].includes(userRole)) {
        return c.json(
          { error: "Seuls les admin, supervisor et operator peuvent être assignés" },
          400
        );
      }
    }

    // Vérifier que la réclamation existe
    const existingClaim = await db
      .select()
      .from(claims)
      .where(eq(claims.id, id))
      .limit(1);

    if (existingClaim.length === 0) {
      return c.json({ error: "Réclamation non trouvée" }, 404);
    }

    const updatedClaim = await db
      .update(claims)
      .set({
        assignedTo: assignedToId,
        updatedAt: new Date(),
      })
      .where(eq(claims.id, id))
      .returning({
        id: claims.id,
        clientId: claims.clientId,
        title: claims.title,
        description: claims.description,
        status: claims.status,
        reply: claims.reply,
        filePaths: claims.filePaths,
        assignedTo: claims.assignedTo,
        createdAt: claims.createdAt,
        updatedAt: claims.updatedAt,
      });

    return c.json(updatedClaim[0]);
  } catch (error: any) {
    console.error("Error assigning claim:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// ==================== SERVER ====================
const port = 3002;
console.log(`Mini ERP API → http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});
