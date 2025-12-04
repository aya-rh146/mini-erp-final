// backend/src/index.ts
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { logger } from 'hono/logger';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { users, claims, leads, clients, products, claimComments, payments } from "../db/schema";
import { eq, desc, and, inArray, or, isNull, ne } from "drizzle-orm";
import { handleFileUpload } from "./upload";
import { serveStatic } from "@hono/node-server/serve-static";
import { broadcastClaimEvent } from "./realtime";

const app = new Hono();

// Configuration CORS
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
  ],
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 600, // Durée de mise en cache des pré-vérifications CORS (en secondes)
}));

// Middleware de logging
app.use('*', logger());

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
app.post("/api/claims", authenticate, requireClient, async (c: any) => {
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

    // Émettre événement Realtime
    await broadcastClaimEvent("claim_created", { claimId: newClaim[0].id });

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

    let result;
    if (user.role === "admin") {
      // Admin voit toutes les réclamations
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
    } else if (user.role === "supervisor") {
      // Supervisor voit les réclamations assignées à ses opérateurs OU non assignées
      const operators = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.supervisorId, user.id), eq(users.role, "operator")));
      const operatorIds = operators.map((o) => o.id);
      
      if (operatorIds.length > 0) {
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
          .where(
            or(
              inArray(claims.assignedTo, operatorIds),
              isNull(claims.assignedTo)
            )
          )
          .orderBy(desc(claims.createdAt));
      } else {
        // Si pas d'opérateurs, voir seulement les claims non assignés
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
          .where(isNull(claims.assignedTo))
          .orderBy(desc(claims.createdAt));
      }
    } else if (user.role === "operator") {
      // Operator voit seulement les réclamations qui lui sont assignées
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
        .where(eq(claims.assignedTo, user.id))
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

    // Émettre événement Realtime
    await broadcastClaimEvent("claim_status_changed", {
      claimId: updatedClaim[0].id,
      status: updatedClaim[0].status || undefined,
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

    // Émettre événement Realtime
    await broadcastClaimEvent("claim_reply_added", { claimId: updatedClaim[0].id });

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
app.patch("/api/claims/:id/assign", authenticate, async (c: any) => {
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

    // Émettre événement Realtime
    await broadcastClaimEvent("claim_assigned", {
      claimId: updatedClaim[0].id,
      assignedTo: updatedClaim[0].assignedTo,
    });

    return c.json(updatedClaim[0]);
  } catch (error: any) {
    console.error("Error assigning claim:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// ==================== ROUTES COMMENTS (CLAIMS) ====================

/**
 * GET /api/claims/:id/comments
 * Liste les commentaires d'une réclamation
 */
app.get("/api/claims/:id/comments", authenticate, async (c: any) => {
  try {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    // Vérifier que la réclamation existe
    const claim = await db.select().from(claims).where(eq(claims.id, id)).limit(1);
    if (claim.length === 0) {
      return c.json({ error: "Réclamation non trouvée" }, 404);
    }

    // Vérifier les permissions
    const allowedRoles: UserRole[] = ["admin", "supervisor", "operator"];
    if (!allowedRoles.includes(user.role) && claim[0].clientId !== user.id) {
      return c.json({ error: "Accès refusé" }, 403);
    }

    // Récupérer les commentaires
    const allComments = await db
      .select({
        id: claimComments.id,
        claimId: claimComments.claimId,
        authorId: claimComments.authorId,
        role: claimComments.role,
        content: claimComments.content,
        visibleToClient: claimComments.visibleToClient,
        createdAt: claimComments.createdAt,
      })
      .from(claimComments)
      .where(eq(claimComments.claimId, id))
      .orderBy(desc(claimComments.createdAt));

    // Filtrer selon le rôle : client ne voit que les commentaires visibles
    const filtered =
      user.role === "client"
        ? allComments.filter((c) => c.visibleToClient)
        : allComments;

    return c.json(filtered);
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/claims/:id/comments
 * Ajoute un commentaire à une réclamation
 */
app.post("/api/claims/:id/comments", authenticate, async (c: any) => {
  try {
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const content = (body.content as string | undefined)?.trim();
    if (!content) {
      return c.json({ error: "Contenu obligatoire" }, 400);
    }

    // Vérifier que la réclamation existe
    const claim = await db.select().from(claims).where(eq(claims.id, id)).limit(1);
    if (claim.length === 0) {
      return c.json({ error: "Réclamation non trouvée" }, 404);
    }

    // Vérifier les permissions
    const allowedRoles: UserRole[] = ["admin", "supervisor", "operator"];
    if (user.role === "client" && claim[0].clientId !== user.id) {
      return c.json({ error: "Accès refusé" }, 403);
    }
    if (user.role === "operator" && claim[0].assignedTo !== user.id) {
      return c.json({ error: "Accès refusé" }, 403);
    }

    const visibleToClient = user.role === "client" ? false : Boolean(body.visibleToClient);

    const newComment = await db
      .insert(claimComments)
      .values({
        claimId: id,
        authorId: user.id,
        role: user.role,
        content,
        visibleToClient,
      })
      .returning({
        id: claimComments.id,
        claimId: claimComments.claimId,
        authorId: claimComments.authorId,
        role: claimComments.role,
        content: claimComments.content,
        visibleToClient: claimComments.visibleToClient,
        createdAt: claimComments.createdAt,
      });

    // Émettre événement Realtime
    await broadcastClaimEvent("claim_comment_added", {
      claimId: id,
      commentId: newComment[0].id,
    });

    return c.json(newComment[0], 201);
  } catch (error: any) {
    console.error("Error creating comment:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/leads
 * Récupère tous les leads en fonction du rôle de l'utilisateur
 */
app.get("/api/leads", authenticate, async (c: any) => {
  try {
    const user = c.get("user");
    let result: any[] = [];

    if (user.role === "admin") {
      // L'admin voit tous les leads
      result = await db.select().from(leads).orderBy(desc(leads.createdAt));
    } else if (user.role === "supervisor") {
      // Récupérer les opérateurs du superviseur
      const operators = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.supervisorId, user.id), eq(users.role, "operator")));
      
      const operatorIds = operators.map((o) => o.id);
      
      if (operatorIds.length > 0) {
        // Uniquement les leads assignés à ses opérateurs
        result = await db
          .select()
          .from(leads)
          .where(inArray(leads.assignedTo, operatorIds))
          .orderBy(desc(leads.createdAt));
      } else {
        // Si pas d'opérateurs, ne rien retourner
        result = [];
      }
    } else if (user.role === "operator") {
      result = await db
        .select()
        .from(leads)
        .where(eq(leads.assignedTo, user.id))
        .orderBy(desc(leads.createdAt));
    } else {
      return c.json({ error: "Accès refusé" }, 403);
    }

    return c.json(result);
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/leads
 * Crée un nouveau lead (admin/operator uniquement)
 * Les superviseurs ne peuvent pas créer directement des leads
 */
app.post("/api/leads", authenticate, async (c: any) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    // Vérifier les autorisations
    if (user.role !== "admin" && user.role !== "operator") {
      return c.json({ error: "Accès refusé. Seuls les administrateurs et opérateurs peuvent créer des leads." }, 403);
    }

    if (!body.name) {
      return c.json({ error: "Le nom est obligatoire" }, 400);
    }

    // Si c'est un opérateur, il ne peut s'assigner que lui-même
    if (user.role === "operator") {
      body.assignedTo = user.id;
    }

    const newLead = await db
      .insert(leads)
      .values({
        name: body.name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        status: body.status || "new",
        assignedTo: body.assignedTo ? parseInt(body.assignedTo) : null,
        notes: body.notes?.trim() || null,
      })
      .returning();

    return c.json(newLead[0], 201);
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/leads/:id
 * Récupère un lead par ID
 */
app.get("/api/leads/:id", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user");

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const result = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: "Lead non trouvé" }, 404);
    }

    const lead = result[0];

    // Vérifier les permissions
    if (user.role === "operator" && lead.assignedTo !== user.id) {
      return c.json({ error: "Accès refusé" }, 403);
    }

    return c.json(lead);
  } catch (error: any) {
    console.error("Error fetching lead:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * PATCH /api/leads/:id/assign
 * Assigner un lead à un opérateur (admin/supervisor)
 */
app.patch("/api/leads/:id/assign", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const user = c.get("user");

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    if (body.assignedTo === undefined) {
      return c.json({ error: "assignedTo est obligatoire" }, 400);
    }

    // Vérifier que le lead existe
    const lead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (lead.length === 0) {
      return c.json({ error: "Lead non trouvé" }, 404);
    }

    // Vérifier les permissions
    if (user.role === "supervisor") {
      // Récupérer les opérateurs du superviseur
      const operators = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.supervisorId, user.id),
          eq(users.role, "operator")
        ));
      
      const operatorIds = operators.map(op => op.id);
      
      // Vérifier que le lead est bien assigné à un de ses opérateurs
      if (lead[0].assignedTo && !operatorIds.includes(lead[0].assignedTo)) {
        return c.json({ error: "Accès non autorisé à ce lead" }, 403);
      }

      // Vérifier que la nouvelle assignation est valide
      if (body.assignedTo && !operatorIds.includes(parseInt(body.assignedTo))) {
        return c.json({ error: "Vous ne pouvez assigner qu'à vos opérateurs" }, 403);
      }
    } else if (user.role === "operator") {
      return c.json({ error: "Accès refusé" }, 403);
    }

    // Mettre à jour l'assignation
    const updateData: any = {
      assignedTo: body.assignedTo ? parseInt(body.assignedTo) : null
    };
    
    const updatedLead = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, id))
      .returning();

    return c.json(updatedLead[0]);
  } catch (error: any) {
    console.error("Error assigning lead:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * PATCH /api/leads/:id
 * Met à jour un lead (statut, assignation, notes)
 */
app.patch("/api/leads/:id", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const user = c.get("user");

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    // Vérifier que le lead existe
    const existingLead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (existingLead.length === 0) {
      return c.json({ error: "Lead non trouvé" }, 404);
    }

    // Vérifier les permissions
    if (user.role === "operator" && existingLead[0].assignedTo !== user.id) {
      return c.json({ error: "Accès refusé" }, 403);
    }

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assignedTo !== undefined) {
      updateData.assignedTo = body.assignedTo ? parseInt(body.assignedTo) : null;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;

    const updated = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, id))
      .returning();

    return c.json(updated[0]);
  } catch (error: any) {
    console.error("Error updating lead:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * DELETE /api/leads/:id
 * Supprime un lead (admin/supervisor)
 */
app.delete("/api/leads/:id", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    await db.delete(leads).where(eq(leads.id, id));

    return c.json({ success: true, message: "Lead supprimé avec succès" });
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/leads/:id/convert
 * Convertit un lead en client (admin uniquement)
 */
app.post("/api/leads/:id/convert", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const lead = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (lead.length === 0) {
      return c.json({ error: "Lead non trouvé" }, 404);
    }

    const leadData = lead[0];
    if (!leadData.email) {
      return c.json({ error: "Le lead doit avoir un email pour être converti" }, 400);
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, leadData.email))
      .limit(1);

    let userId: number;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      // Vérifier si c'est déjà un client
      const existingClient = await db
        .select()
        .from(clients)
        .where(eq(clients.userId, userId))
        .limit(1);
      if (existingClient.length > 0) {
        return c.json({ error: "Un client avec cet email existe déjà" }, 409);
      }
    } else {
      // Créer un nouvel utilisateur client
      const defaultPassword = "password123";
      const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
      const newUser = await db
        .insert(users)
        .values({
          email: leadData.email,
          password: hashedPassword,
          fullName: leadData.name,
          role: "client",
        })
        .returning();
      userId = newUser[0].id;
    }

    // Créer le client
    const newClient = await db
      .insert(clients)
      .values({
        userId: userId,
        company: leadData.name,
      })
      .returning();

    // Supprimer le lead
    await db.delete(leads).where(eq(leads.id, id));

    return c.json({
      success: true,
      client: newClient[0],
      message: "Lead converti en client avec succès",
    });
  } catch (error: any) {
    console.error("Error converting lead:", error);
    if (error.code === "23505") {
      return c.json({ error: "Un client avec cet email existe déjà" }, 409);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// ==================== ROUTES CLIENTS ====================

/**
 * GET /api/clients
 * Liste tous les clients (admin/supervisor)
 */
app.get("/api/clients", authenticate, async (c: any) => {
  try {
    const result = await db
      .select({
        id: clients.id,
        userId: clients.userId,
        company: clients.company,
        address: clients.address,
        email: users.email,
        fullName: users.fullName,
      })
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id))
      .orderBy(clients.id);

    return c.json(result);
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/clients/:id
 * Récupère un client par ID
 */
app.get("/api/clients/:id", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const result = await db
      .select({
        id: clients.id,
        userId: clients.userId,
        company: clients.company,
        address: clients.address,
        email: users.email,
        fullName: users.fullName,
      })
      .from(clients)
      .leftJoin(users, eq(clients.userId, users.id))
      .where(eq(clients.id, id))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: "Client non trouvé" }, 404);
    }

    return c.json(result[0]);
  } catch (error: any) {
    console.error("Error fetching client:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * PUT /api/clients/:id
 * Met à jour un client (admin)
 */
app.put("/api/clients/:id", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const updateData: any = {};
    if (body.company !== undefined) updateData.company = body.company?.trim() || null;
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;

    const updated = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();

    if (updated.length === 0) {
      return c.json({ error: "Client non trouvé" }, 404);
    }

    return c.json(updated[0]);
  } catch (error: any) {
    console.error("Error updating client:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/clients/:id/income
 * Calcule le revenu total d'un client
 */
app.get("/api/clients/:id/income", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { sql } = await import("drizzle-orm");

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    // Vérifier que le client existe
    const client = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (client.length === 0) {
      return c.json({ error: "Client non trouvé" }, 404);
    }

    // Calculer le revenu depuis les produits assignés
    let totalIncome = "0.00";
    let breakdown: any[] = [];
    
    try {
      const result = await db.execute(
        sql`SELECT p.id, p.name, p.type, p.price, cp.id as cp_id
            FROM products p
            INNER JOIN client_products cp ON p.id = cp.product_id
            WHERE cp.client_id = ${id}`
      );
      
      breakdown = result.rows || [];
      totalIncome = breakdown.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.price) || 0);
      }, 0).toFixed(2);
    } catch (error: any) {
      console.error("Error calculating income from products:", error);
      // Fallback: essayer avec payments si disponible
      try {
        const result = await db.execute(
          sql`SELECT COALESCE(SUM(amount), 0)::text as total FROM payments WHERE client_id = ${id}`
        );
        totalIncome = result.rows[0]?.total || "0.00";
      } catch {
        // Les deux méthodes ont échoué
      }
    }

    return c.json({ 
      clientId: id, 
      totalIncome,
      breakdown: breakdown.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        price: parseFloat(item.price) || 0,
      }))
    });
  } catch (error: any) {
    console.error("Error calculating income:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// ==================== ROUTES PRODUITS ====================

/**
 * GET /api/products
 * Liste tous les produits
 */
app.get("/api/products", authenticate, async (c: any) => {
  try {
    const result = await db.select().from(products).orderBy(products.id);
    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({
      success: false,
      error: "Internal Server Error",
      message: "Une erreur est survenue lors de la récupération des produits"
    }, 500);
  }
});

/**
 * GET /api/products/:id
 * Récupère un produit par ID
 */
app.get("/api/products/:id", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id) || id <= 0) {
      return c.json({
        success: false,
        error: "Validation Error",
        message: "ID de produit invalide"
      }, 400);
    }

    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (result.length === 0) {
      return c.json({
        success: false,
        error: "Not Found",
        message: "Le produit demandé n'existe pas"
      }, 404);
    }

    return c.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return c.json({
      success: false,
      error: "Internal Server Error",
      message: "Une erreur est survenue lors de la récupération du produit"
    }, 500);
  }
});

/**
 * POST /api/products
 * Crée un nouveau produit (admin)
 */
app.post("/api/products", authenticate, async (c: any) => {
  try {
    const body = await c.req.json();

    // Validation des champs obligatoires
    if (!body.name) {
      return c.json({ 
        success: false,
        error: "Validation Error",
        message: "Le nom du produit est requis",
        field: "name"
      }, 400);
    }

    if (!body.price || isNaN(parseFloat(body.price)) || parseFloat(body.price) <= 0) {
      return c.json({
        success: false,
        error: "Validation Error",
        message: "Un prix valide est requis",
        field: "price"
      }, 400);
    }

    if (!body.type || !['product', 'service'].includes(body.type)) {
      return c.json({
        success: false,
        error: "Validation Error",
        message: "Un type valide est requis (product ou service)",
        field: "type"
      }, 400);
    }

    // Préparer les données d'insertion selon le schéma
    const productData: any = {
      name: body.name,
      type: body.type
    };

    // Ajouter le prix s'il est valide
    if (body.price !== undefined && !isNaN(parseFloat(body.price))) {
      productData.price = parseFloat(body.price).toFixed(2);
    }

    const [newProduct] = await db.insert(products)
      .values(productData)
      .returning();

    return c.json({
      success: true,
      data: newProduct
    }, 201);
  } catch (error) {
    console.error("Error creating product:", error);
    
    // Gestion des erreurs de base de données
    if (error instanceof Error && 'code' in error && error.code === '23505') { // Violation de contrainte unique
      return c.json({
        success: false,
        error: "Duplicate Entry",
        message: "Un produit avec ce nom existe déjà",
        field: "name"
      }, 400);
    }
    
    return c.json({
      success: false,
      error: "Server Error",
      message: "Une erreur est survenue lors de la création du produit"
    }, 500);
  }
});

/**
 * PUT /api/products/:id
 * Met à jour un produit (admin)
 */
app.put("/api/products/:id", authenticate, async (c: any) => {
try {
const id = parseInt(c.req.param("id"));
const body = await c.req.json();

if (isNaN(id) || id <= 0) {
  return c.json({
    success: false,
    error: "Validation Error",
    message: "ID de produit invalide"
  }, 400);
}

// Validation des champs obligatoires
if (!body.name) {
  return c.json({
    success: false,
    error: "Validation Error",
    message: "Le nom du produit est requis",
    field: "name"
  }, 400);
}

if (!body.price || isNaN(parseFloat(body.price)) || parseFloat(body.price) <= 0) {
  return c.json({
    success: false,
    error: "Validation Error",
    message: "Un prix valide est requis",
    field: "price"
  }, 400);
}

if (!body.type || !['product', 'service'].includes(body.type)) {
  return c.json({
    success: false,
    error: "Validation Error",
    message: "Un type valide est requis (product ou service)",
    field: "type"
  }, 400);
}

// Vérifier d'abord si le produit existe
const [existingProduct] = await db
  .select()
  .from(products)
  .where(eq(products.id, id))
  .limit(1);

if (!existingProduct) {
  return c.json({
    success: false,
    error: "Not Found",
    message: "Le produit demandé n'existe pas"
  }, 404);
}

// Vérifier si le nom est déjà utilisé par un autre produit
const [duplicateProduct] = await db
  .select()
  .from(products)
  .where(and(
    eq(products.name, body.name),
    ne(products.id, id) // Exclure le produit actuel de la vérification
  ))
  .limit(1);

if (duplicateProduct) {
  return c.json({
    success: false,
    error: "Duplicate Entry",
    message: "Un produit avec ce nom existe déjà",
    field: "name"
  }, 400);
}

    // Mettre à jour le produit selon le schéma de la base de données
    const updateData: any = {
      name: body.name,
      type: body.type
    };

    // Vérifier si le prix est fourni et est un nombre valide
    if (body.price !== undefined && !isNaN(parseFloat(body.price))) {
      updateData.price = body.price.toString();
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

return c.json({
  success: true,
  data: updatedProduct
});
  } catch (error) {
    console.error("Error updating product:", error);
    
    // Gestion des erreurs de base de données
    if (error instanceof Error && 'code' in error && error.code === '23505') { // Violation de contrainte unique
      return c.json({
        success: false,
        error: "Duplicate Entry",
        message: "Un produit avec ce nom existe déjà",
        field: "name"
      }, 400);
    }
    
    return c.json({
      success: false,
      error: "Internal Server Error",
      message: "Une erreur est survenue lors de la mise à jour du produit"
    }, 500);
  }
});

/**
 * DELETE /api/products/:id
 * Supprime un produit (admin)
 */
app.delete("/api/products/:id", authenticate, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    await db.delete(products).where(eq(products.id, id));

    return c.json({ success: true, message: "Produit supprimé avec succès" });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/clients/:id/products
 * Liste les produits assignés à un client
 */
app.get("/api/clients/:id/products", authenticate, async (c: any) => {
  try {
    const clientId = parseInt(c.req.param("id"));
    const { sql } = await import("drizzle-orm");

    if (isNaN(clientId)) {
      return c.json({ error: "ID client invalide" }, 400);
    }

    try {
      const result = await db.execute(
        sql`SELECT p.* FROM products p
            INNER JOIN client_products cp ON p.id = cp.product_id
            WHERE cp.client_id = ${clientId}`
      );
      return c.json(result.rows);
    } catch {
      return c.json({ error: "Table client_products n'existe pas. Exécutez la migration." }, 500);
    }
  } catch (error: any) {
    console.error("Error fetching client products:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/clients/:id/products
 * Assigne un produit à un client (many-to-many)
 */
app.post("/api/clients/:id/products", authenticate, async (c: any) => {
  try {
    const clientId = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { sql } = await import("drizzle-orm");

    if (isNaN(clientId) || !body.productId) {
      return c.json({ error: "ID client et productId obligatoires" }, 400);
    }

    // Vérifier que client et product existent
    const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    const product = await db.select().from(products).where(eq(products.id, body.productId)).limit(1);

    if (client.length === 0 || product.length === 0) {
      return c.json({ error: "Client ou produit non trouvé" }, 404);
    }

    // Insérer dans client_products (si table existe)
    try {
      await db.execute(
        sql`INSERT INTO client_products (client_id, product_id) VALUES (${clientId}, ${body.productId}) ON CONFLICT DO NOTHING`
      );
      return c.json({ success: true, message: "Produit assigné au client" });
    } catch {
      return c.json({ error: "Table client_products n'existe pas. Exécutez la migration." }, 500);
    }
  } catch (error: any) {
    console.error("Error assigning product:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * DELETE /api/clients/:id/products/:productId
 * Retire un produit d'un client
 */
app.delete("/api/clients/:id/products/:productId", authenticate, requireSupervisor, async (c: any) => {
  try {
    const clientId = parseInt(c.req.param("id"));
    const productId = parseInt(c.req.param("productId"));
    const { sql } = await import("drizzle-orm");

    if (isNaN(clientId) || isNaN(productId)) {
      return c.json({ error: "IDs invalides" }, 400);
    }

    try {
      await db.execute(
        sql`DELETE FROM client_products WHERE client_id = ${clientId} AND product_id = ${productId}`
      );
      return c.json({ success: true, message: "Produit retiré du client" });
    } catch {
      return c.json({ error: "Table client_products n'existe pas. Exécutez la migration." }, 500);
    }
  } catch (error: any) {
    console.error("Error removing product:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// ==================== ROUTES SUPERVISOR ====================

/**
 * GET /api/supervisor/overview
 * Vue d'ensemble pour le superviseur : ses opérateurs + leurs leads/claims
 */
app.get("/api/supervisor/overview", authenticate, requireSupervisor, async (c: any) => {
  try {
    const user = c.get("user");

    let operators: any[] = [];
    let operatorIds: number[] = [];
    let operatorLeads: any[] = [];
    let operatorClaims: any[] = [];

    if (user.role === "admin") {
      // Admin voit tous les opérateurs et toutes les données
      operators = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
        })
        .from(users)
        .where(eq(users.role, "operator"));

      operatorIds = operators.map((o) => o.id);

      // Admin voit tous les leads
      operatorLeads = await db
        .select()
        .from(leads)
        .orderBy(desc(leads.createdAt));

      // Admin voit toutes les claims
      operatorClaims = await db
        .select()
        .from(claims)
        .orderBy(desc(claims.createdAt));
    } else {
      // Supervisor : récupérer les opérateurs du superviseur
      operators = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
        })
        .from(users)
        .where(and(eq(users.supervisorId, user.id), eq(users.role, "operator")));

      operatorIds = operators.map((o) => o.id);

      // Leads : assignés aux opérateurs OU non assignés
      if (operatorIds.length > 0) {
        operatorLeads = await db
          .select()
          .from(leads)
          .where(
            or(
              inArray(leads.assignedTo, operatorIds),
              isNull(leads.assignedTo)
            )
          )
          .orderBy(desc(leads.createdAt));
      } else {
        // Si pas d'opérateurs, voir seulement les leads non assignés
        operatorLeads = await db
          .select()
          .from(leads)
          .where(isNull(leads.assignedTo))
          .orderBy(desc(leads.createdAt));
      }

      // Claims : assignés aux opérateurs OU non assignés
      if (operatorIds.length > 0) {
        operatorClaims = await db
          .select()
          .from(claims)
          .where(
            or(
              inArray(claims.assignedTo, operatorIds),
              isNull(claims.assignedTo)
            )
          )
          .orderBy(desc(claims.createdAt));
      } else {
        // Si pas d'opérateurs, voir seulement les claims non assignés
        operatorClaims = await db
          .select()
          .from(claims)
          .where(isNull(claims.assignedTo))
          .orderBy(desc(claims.createdAt));
      }
    }

    return c.json({
      supervisorId: user.id,
      operators: operators || [],
      leads: operatorLeads || [],
      claims: operatorClaims || [],
    });
  } catch (error: any) {
    console.error("Error fetching supervisor overview:", error);
    const user = c.get("user");
    // En cas d'erreur, retourner un objet vide plutôt qu'une erreur 500
    return c.json({
      supervisorId: user?.id || 0,
      operators: [],
      leads: [],
      claims: [],
    });
  }
});

// ==================== ROUTES ANALYTICS ====================

/**
 * GET /api/analytics/leads-status
 * Statistiques des leads par statut
 */
app.get("/api/analytics/leads-status", authenticate, requireAdmin, async (c: any) => {
  try {
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(
      sql`SELECT status, COUNT(*)::int as count FROM leads GROUP BY status ORDER BY status`
    );
    return c.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching leads status:", error);
    // Si la table n'existe pas, retourner un tableau vide
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return c.json([]);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/analytics/revenue-monthly
 * Revenu mensuel (depuis payments)
 */
app.get("/api/analytics/revenue-monthly", authenticate, requireAdmin, async (c: any) => {
  try {
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(
      sql`SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') as month,
                 COALESCE(SUM(amount), 0)::text as total
           FROM payments
           GROUP BY 1
           ORDER BY 1
           LIMIT 12`
    );
    return c.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching revenue monthly:", error);
    // Si la table n'existe pas, retourner des données vides
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return c.json([]);
    }
    return c.json([]);
  }
});

/**
 * GET /api/analytics/claims-status
 * Statistiques des claims par statut
 */
app.get("/api/analytics/claims-status", authenticate, requireAdmin, async (c: any) => {
  try {
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(
      sql`SELECT status, COUNT(*)::int as count FROM claims GROUP BY status ORDER BY status`
    );
    return c.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching claims status:", error);
    // Si la table n'existe pas, retourner un tableau vide
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return c.json([]);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/analytics/claims-over-time
 * Évolution des claims dans le temps
 */
app.get("/api/analytics/claims-over-time", authenticate, requireAdmin, async (c: any) => {
  try {
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(
      sql`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
                 COUNT(*)::int as count
           FROM claims
           GROUP BY 1
           ORDER BY 1
           LIMIT 30`
    );
    return c.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching claims over time:", error);
    // Si la table n'existe pas, retourner un tableau vide
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return c.json([]);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/analytics/top-clients
 * Top 5 clients par revenu
 */
app.get("/api/analytics/top-clients", authenticate, requireAdmin, async (c: any) => {
  try {
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(
      sql`SELECT c.id as client_id,
                 c.company,
                 COALESCE(SUM(p.amount), 0)::text as total
           FROM clients c
           LEFT JOIN payments p ON p.client_id = c.id
           GROUP BY c.id, c.company
           ORDER BY SUM(p.amount) DESC NULLS LAST
           LIMIT 5`
    );
    return c.json(result.rows || []);
  } catch (error: any) {
    console.error("Error fetching top clients:", error);
    // Si la table payments n'existe pas, retourner des données vides
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return c.json([]);
    }
    return c.json([]);
  }
});

// ==================== ROUTES PAYMENTS ====================

/**
 * GET /api/payments
 * Liste tous les paiements (admin/supervisor)
 */
app.get("/api/payments", authenticate, requireSupervisor, async (c: any) => {
  try {
    const result = await db
      .select({
        id: payments.id,
        clientId: payments.clientId,
        amount: payments.amount,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .orderBy(desc(payments.paidAt));

    return c.json(result);
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    // Si la table n'existe pas, retourner un tableau vide
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return c.json([]);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/payments
 * Crée un nouveau paiement (admin/supervisor)
 */
app.post("/api/payments", authenticate, requireSupervisor, async (c: any) => {
  try {
    const body = await c.req.json();

    if (!body.clientId) {
      return c.json({ error: "clientId est obligatoire" }, 400);
    }

    if (!body.amount || parseFloat(body.amount) <= 0) {
      return c.json({ error: "Le montant doit être supérieur à 0" }, 400);
    }

    // Vérifier que le client existe
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, parseInt(body.clientId)))
      .limit(1);

    if (client.length === 0) {
      return c.json({ error: "Client non trouvé" }, 404);
    }

    const newPayment = await db
      .insert(payments)
      .values({
        clientId: parseInt(body.clientId),
        amount: body.amount.toString(),
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      })
      .returning({
        id: payments.id,
        clientId: payments.clientId,
        amount: payments.amount,
        paidAt: payments.paidAt,
      });

    return c.json(newPayment[0], 201);
  } catch (error: any) {
    console.error("Error creating payment:", error);
    if (error.code === "23503") {
      return c.json({ error: "Client non trouvé" }, 404);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/payments/:id
 * Récupère un paiement par ID
 */
app.get("/api/payments/:id", authenticate, requireSupervisor, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const result = await db
      .select({
        id: payments.id,
        clientId: payments.clientId,
        amount: payments.amount,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: "Paiement non trouvé" }, 404);
    }

    return c.json(result[0]);
  } catch (error: any) {
    console.error("Error fetching payment:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * DELETE /api/payments/:id
 * Supprime un paiement (admin uniquement)
 */
app.delete("/api/payments/:id", authenticate, requireAdmin, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    await db.delete(payments).where(eq(payments.id, id));

    return c.json({ success: true, message: "Paiement supprimé avec succès" });
  } catch (error: any) {
    console.error("Error deleting payment:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// ==================== SERVER ====================
const port = parseInt(process.env.PORT || '3002');
console.log(`\nMini ERP API → http://localhost:${port}`);

// Gestion des erreurs non attrapées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Démarrer le serveur
serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0', // Écouter sur toutes les interfaces
});

console.log('Configuration CORS activée pour les origines autorisées');
console.log('En attente de connexions...');
