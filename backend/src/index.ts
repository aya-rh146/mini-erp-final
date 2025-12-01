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
import { eq, desc } from "drizzle-orm";

const app = new Hono();

// ==================== CORS ====================
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"], // Frontend URLs
    credentials: true, // Allow cookies
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Cookie"],
  })
);

// ==================== DATABASE ====================
if (!process.env.DATABASE_URL) {
  console.error("❌ ERREUR: DATABASE_URL n'est pas défini dans .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon kaykhsser ila ma zdtich ssl f Windows
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

// ==================== MIDDLEWARES ====================
const authenticate = async (c: any, next: any) => {
  const cookie = c.req.header("Cookie") || "";
  const token = cookie.match(/token=([^;]+)/)?.[1];

  if (!token) {
    return c.json({ error: "Unauthorized – no token" }, 401);
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; role: string; name: string | null };
    c.set("user", payload);
    await next();
  } catch (error) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
};

const requireAdmin = async (c: any, next: any) => {
  const user = c.get("user");
  if (user?.role !== "admin") {
    return c.json({ error: "Forbidden – Admin only" }, 403);
  }
  await next();
};

// ==================== ROUTES ====================

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
    return c.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    }, 500);
  }
});

// Initialisation : Créer l'admin par défaut (une seule fois)
app.post("/api/init", async (c) => {
  try {
    // Vérifier si un admin existe déjà
    const existingAdmin = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
    
    if (existingAdmin.length > 0) {
      return c.json({ 
        success: false, 
        message: "Un administrateur existe déjà. Utilisez /api/auth/login pour vous connecter." 
      }, 400);
    }

    // Créer l'admin par défaut
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

// Login
app.post("/api/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email et mot de passe obligatoires" }, 400);
    }

    const result = await db.select().from(users).where(eq(users.email, email));
    const user = result[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return c.json({ error: "Email ou mot de passe incorrect" }, 401);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.fullName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // In development, don't use Secure flag (requires HTTPS)
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${isProduction ? "; Secure" : ""}`;
    c.header("Set-Cookie", cookieOptions);

    return c.json({
      success: true,
      user: { id: user.id, role: user.role, name: user.fullName },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    
    // Messages d'erreur plus explicites
    let errorMessage = "Erreur serveur lors de la connexion";
    let hint = undefined;
    
    if (error?.code === "42P01") {
      errorMessage = "La table 'users' n'existe pas";
      hint = "Exécutez 'npm run migrate' dans le dossier backend pour créer les tables.";
    } else if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND") {
      errorMessage = "Impossible de se connecter à la base de données";
      hint = "Vérifiez que DATABASE_URL est correct dans le fichier .env et que la base de données est accessible.";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return c.json({ 
      error: errorMessage,
      hint: hint,
      details: process.env.NODE_ENV === "development" ? error?.message : undefined
    }, 500);
  }
});

// Admin : Créer un utilisateur
app.post("/api/users", authenticate, requireAdmin, async (c) => {
  const body = await c.req.json();

  if (!body.email || !body.password) {
    return c.json({ error: "Email et mot de passe obligatoires" }, 400);
  }

  const hashedPassword = bcrypt.hashSync(body.password, 10);

  try {
    const newUser = await db
      .insert(users)
      .values({
        email: body.email,
        password: hashedPassword,
        fullName: body.fullName ?? null,
        role: body.role ?? "client",
        supervisorId: body.supervisorId ?? null,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      });

    return c.json(newUser[0]);
  } catch (error: any) {
    if (error.code === "23505") {
      return c.json({ error: "Cet email existe déjà" }, 409);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

// Route protégée – qui suis-je ?
app.get("/api/me", authenticate, (c: any) => {
  return c.json(c.get("user"));
});

const requireClient = async (c: any, next: any) => {
  const user = c.get("user");
  if (user?.role !== "client") {
    return c.json({ error: "Forbidden – Client only" }, 403);
  }
  await next();
};

// Créer une réclamation (client uniquement)
app.post("/api/claims", authenticate, requireClient, async (c: any) => {
  const user = c.get("user");
  const body = await c.req.json();

  if (!body.title || !body.description) {
    return c.json({ error: "Titre et description obligatoires" }, 400);
  }

  try {
    const newClaim = await db
      .insert(claims)
      .values({
        clientId: user.id,
        title: body.title,
        description: body.description,
        files: body.files || [],
        status: "submitted",
      })
      .returning({
        id: claims.id,
        title: claims.title,
        description: claims.description,
        status: claims.status,
        files: claims.files,
        createdAt: claims.createdAt,
      });

    return c.json(newClaim[0]);
  } catch (error: any) {
    console.error("Error creating claim:", error);
    return c.json({ error: "Erreur serveur lors de la création" }, 500);
  }
});

// Lister les réclamations (client voit ses propres, admin voit tout)
app.get("/api/claims", authenticate, async (c: any) => {
  const user = c.get("user");

  try {
    let result;
    if (user.role === "admin") {
      // Admin voit toutes les réclamations
      result = await db.select().from(claims).orderBy(desc(claims.createdAt));
    } else {
      // Client voit seulement ses réclamations
      result = await db
        .select()
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

// ==================== SERVER ====================
const port = 3002;
console.log(`Mini ERP API → http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});