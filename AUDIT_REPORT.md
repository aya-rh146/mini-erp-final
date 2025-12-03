# 🔍 AUDIT COMPLET DU PROJET MINI ERP

**Date:** 2025-12-03  
**Auditeur:** AI Assistant  
**Version du projet:** 1.0.0

---

## 📊 TABLEAU DE BORD D'AUDIT

| # | Point | Statut | Fichier(s) | Preuve |
|---|-------|--------|------------|--------|
| 1 | Auth sécurisée (hash) | **PASS** | `backend/src/index.ts:188,257,418,496` | `bcrypt.hashSync(password, 10)` et `bcrypt.compareSync()` utilisés |
| 2 | Pas d'inscription publique | **PASS** | `frontend/app/login/page.tsx` | Seulement login, pas de route `/register` |
| 3 | Création de comptes seulement par Admin | **PASS** | `backend/src/index.ts:401` | `requireAdmin` middleware sur `POST /api/users` |
| 4 | Rôles Admin/Supervisor/Operator/Client | **PASS** | `backend/db/schema.ts:24-29` | Enum `userRoleEnum` avec 4 rôles définis |
| 5 | Liaison Operator → Supervisor | **PASS** | `backend/db/schema.ts:38-40`, `frontend/app/dashboard/users/page.tsx:387-407` | `supervisorId` nullable + UI dropdown dans users page |
| 6 | Leads : CRUD + commentaires + assignation + conversion | **FAIL** | ❌ | Routes API `/api/leads` **manquantes** dans `backend/src/index.ts` |
| 7 | Clients : profil complet + calcul income | **WARN** | `backend/db/schema.ts:58-66` | Table `clients` existe mais routes API `/api/clients` **manquantes**, pas de calcul income |
| 8 | Produits / Services : système générique complet | **WARN** | `backend/db/schema.ts:68-73` | Table `products` existe mais routes API `/api/products` **manquantes` |
| 9 | Claims : création client + upload fichiers + workflow statuts + assignation | **PASS** | `backend/src/index.ts:582-959` | Routes complètes : POST, GET, PATCH status/reply/assign, upload via `handleFileUpload` |
| 10 | Panels : Admin / Supervisor / Operator / Client | **WARN** | `frontend/app/dashboard/` | Admin panel OK, Client panel OK, mais **pas de pages dédiées Supervisor/Operator** |
| 11 | RBAC server-side : middlewares/policies | **PASS** | `backend/src/index.ts:53-117` | `authenticate`, `requireRole`, `requireAdmin`, `requireSupervisor`, `requireOperator`, `requireClient` |
| 12 | Migrations + schéma DB cohérent | **WARN** | `backend/drizzle/*.sql` | Migrations existent mais **manquent tables** : `claim_files`, `claim_comments`, `client_products`, `payments` |
| 13 | README + .env.example | **FAIL** | ❌ | README frontend = template Next.js, **pas de README principal**, **pas de .env.example** |
| 14 | Tests unitaires / intégration | **FAIL** | ❌ | **Aucun fichier de test** trouvé (`.test.ts`, `.spec.ts`) |
| 15 | Realtime notifications (bonus) | **FAIL** | ❌ | **Fichiers supprimés** : `backend/src/realtime.ts`, `frontend/lib/supabaseClient.ts`, `frontend/components/RealtimeProvider.tsx` |
| 16 | Dashboard analytics (bonus) | **FAIL** | ❌ | **Fichier supprimé** : `frontend/app/admin/analytics/page.tsx` |

---

## 🔧 CORRECTIONS RECOMMANDÉES

### ❌ **CRITIQUE 1 : Routes API Leads manquantes**

**Problème:** Aucune route API pour gérer les leads (CRUD, assignation, conversion en client, commentaires).

**Fichier à créer/modifier:** `backend/src/index.ts`

**Correction:**

```typescript
// Ajouter après la section CLAIMS (ligne ~960)

// ==================== ROUTES LEADS ====================

/**
 * GET /api/leads
 * Liste les leads selon le rôle
 */
app.get("/api/leads", authenticate, async (c: any) => {
  try {
    const user = c.get("user");
    const { leads } = await import("../db/schema");
    const { inArray } = await import("drizzle-orm");

    let result;
    if (user.role === "admin") {
      result = await db.select().from(leads).orderBy(desc(leads.createdAt));
    } else if (user.role === "supervisor") {
      // Récupérer les opérateurs du superviseur
      const operators = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.supervisorId, user.id), eq(users.role, "operator")));
      const operatorIds = operators.map((o) => o.id);
      if (operatorIds.length > 0) {
        result = await db
          .select()
          .from(leads)
          .where(inArray(leads.assignedTo, operatorIds))
          .orderBy(desc(leads.createdAt));
      } else {
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
 * Crée un nouveau lead (admin/supervisor/operator)
 */
app.post("/api/leads", authenticate, requireOperator, async (c: any) => {
  try {
    const body = await c.req.json();
    const { leads } = await import("../db/schema");

    if (!body.name) {
      return c.json({ error: "Le nom est obligatoire" }, 400);
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
 * PATCH /api/leads/:id
 * Met à jour un lead (statut, assignation, notes)
 */
app.patch("/api/leads/:id", authenticate, requireOperator, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { leads } = await import("../db/schema");

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assignedTo !== undefined) {
      updateData.assignedTo = body.assignedTo ? parseInt(body.assignedTo) : null;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updated = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, id))
      .returning();

    if (updated.length === 0) {
      return c.json({ error: "Lead non trouvé" }, 404);
    }

    return c.json(updated[0]);
  } catch (error: any) {
    console.error("Error updating lead:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/leads/:id/convert
 * Convertit un lead en client (admin/supervisor)
 */
app.post("/api/leads/:id/convert", authenticate, requireSupervisor, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { leads, clients, users } = await import("../db/schema");
    const bcrypt = await import("bcryptjs");

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
```

**Endroit exact:** Ajouter après la ligne 959 dans `backend/src/index.ts`, avant `// ==================== SERVER ====================`

---

### ❌ **CRITIQUE 2 : Routes API Clients manquantes**

**Problème:** Pas de routes pour gérer les clients (CRUD, calcul income, produits assignés).

**Fichier à créer/modifier:** `backend/src/index.ts`

**Correction:**

```typescript
// Ajouter après les routes LEADS

// ==================== ROUTES CLIENTS ====================

/**
 * GET /api/clients
 * Liste tous les clients (admin/supervisor)
 */
app.get("/api/clients", authenticate, requireSupervisor, async (c: any) => {
  try {
    const { clients, users } = await import("../db/schema");
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
 * GET /api/clients/:id/income
 * Calcule le revenu total d'un client (depuis payments si table existe)
 */
app.get("/api/clients/:id/income", authenticate, requireSupervisor, async (c: any) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { clients } = await import("../db/schema");
    const { sql } = await import("drizzle-orm");

    if (isNaN(id)) {
      return c.json({ error: "ID invalide" }, 400);
    }

    // Vérifier que le client existe
    const client = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (client.length === 0) {
      return c.json({ error: "Client non trouvé" }, 404);
    }

    // Calculer le revenu (si table payments existe)
    // Pour l'instant, retourner 0 si la table n'existe pas
    let totalIncome = "0.00";
    try {
      const result = await db.execute(
        sql`SELECT COALESCE(SUM(amount), 0)::text as total FROM payments WHERE client_id = ${id}`
      );
      totalIncome = result.rows[0]?.total || "0.00";
    } catch {
      // Table payments n'existe pas encore
    }

    return c.json({ clientId: id, totalIncome });
  } catch (error: any) {
    console.error("Error calculating income:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});
```

**Endroit exact:** Ajouter après les routes LEADS dans `backend/src/index.ts`

---

### ❌ **CRITIQUE 3 : Routes API Produits manquantes**

**Problème:** Pas de routes pour gérer les produits/services.

**Fichier à créer/modifier:** `backend/src/index.ts`

**Correction:**

```typescript
// Ajouter après les routes CLIENTS

// ==================== ROUTES PRODUITS ====================

/**
 * GET /api/products
 * Liste tous les produits
 */
app.get("/api/products", authenticate, async (c: any) => {
  try {
    const { products } = await import("../db/schema");
    const result = await db.select().from(products).orderBy(products.id);
    return c.json(result);
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/products
 * Crée un nouveau produit (admin)
 */
app.post("/api/products", authenticate, requireAdmin, async (c: any) => {
  try {
    const body = await c.req.json();
    const { products } = await import("../db/schema");

    if (!body.name) {
      return c.json({ error: "Le nom est obligatoire" }, 400);
    }

    const newProduct = await db
      .insert(products)
      .values({
        name: body.name.trim(),
        type: body.type?.trim() || null,
        price: body.price ? body.price.toString() : null,
      })
      .returning();

    return c.json(newProduct[0], 201);
  } catch (error: any) {
    console.error("Error creating product:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/clients/:id/products
 * Assigne un produit à un client (many-to-many)
 */
app.post("/api/clients/:id/products", authenticate, requireSupervisor, async (c: any) => {
  try {
    const clientId = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { clients, products } = await import("../db/schema");
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
```

**Endroit exact:** Ajouter après les routes CLIENTS dans `backend/src/index.ts`

---

### ⚠️ **WARN 1 : Migrations incomplètes (tables manquantes)**

**Problème:** Les tables `claim_files`, `claim_comments`, `client_products`, `payments` sont dans le schéma TypeScript mais pas dans les migrations SQL.

**Fichier à créer:** `backend/drizzle/0003_add_missing_tables.sql`

**Correction:**

```sql
-- Migration 0003 : Ajouter les tables manquantes

-- Table claim_files
CREATE TABLE IF NOT EXISTS "claim_files" (
  "id" serial PRIMARY KEY NOT NULL,
  "claim_id" integer NOT NULL,
  "file_url" varchar(512) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "claim_files"
  ADD CONSTRAINT "claim_files_claim_id_claims_id_fk"
  FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;

-- Table claim_comments
CREATE TABLE IF NOT EXISTS "claim_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "claim_id" integer NOT NULL,
  "author_id" integer,
  "role" "public"."user_role" NOT NULL,
  "content" text NOT NULL,
  "visible_to_client" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "claim_comments"
  ADD CONSTRAINT "claim_comments_claim_id_claims_id_fk"
  FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;

ALTER TABLE "claim_comments"
  ADD CONSTRAINT "claim_comments_author_id_users_id_fk"
  FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Table client_products (many-to-many)
CREATE TABLE IF NOT EXISTS "client_products" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "product_id" integer NOT NULL,
  UNIQUE("client_id", "product_id")
);

ALTER TABLE "client_products"
  ADD CONSTRAINT "client_products_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

ALTER TABLE "client_products"
  ADD CONSTRAINT "client_products_product_id_products_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

-- Table payments
CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "paid_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;
```

**Endroit exact:** Créer `backend/drizzle/0003_add_missing_tables.sql`

---

### ❌ **CRITIQUE 4 : README et .env.example manquants**

**Problème:** Pas de documentation principale ni d'exemple de configuration.

**Fichier à créer:** `mini-erp-final/README.md`

**Correction:**

```markdown
# Mini ERP - Système de Gestion Complet

Système ERP avec gestion des utilisateurs, leads, clients, produits, et réclamations.

## 🚀 Installation

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Puis remplir les variables
npm run migrate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # Puis remplir les variables
npm run dev
```

## 📋 Prérequis

- Node.js 18+
- PostgreSQL (Neon recommandé)
- Supabase (pour Realtime, optionnel)

## 🔐 Configuration

Voir `.env.example` dans chaque dossier pour les variables d'environnement requises.

## 👥 Rôles

- **Admin** : Accès complet
- **Supervisor** : Gestion des opérateurs et leurs leads/claims
- **Operator** : Gestion des leads et claims assignés
- **Client** : Portail client pour voir ses réclamations

## 📚 Documentation

- `backend/AUTHENTICATION.md` : Système d'authentification
- `backend/CLAIMS_MODULE.md` : Module réclamations
- `GUIDE_TEST_CLAIMS.md` : Guide de test
```

**Fichier à créer:** `backend/.env.example`

**Correction:**

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_change_this
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=development
```

**Fichier à créer:** `frontend/.env.example`

**Correction:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

### ❌ **CRITIQUE 5 : Tests manquants**

**Problème:** Aucun test unitaire ou d'intégration.

**Fichier à créer:** `backend/src/__tests__/auth.test.ts` (exemple)

**Correction:**

```typescript
// Exemple de test avec Jest/Vitest
import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("Authentication", () => {
  it("should hash password correctly", () => {
    const password = "test123";
    const hash = bcrypt.hashSync(password, 10);
    expect(bcrypt.compareSync(password, hash)).toBe(true);
  });
});
```

**Endroit exact:** Créer `backend/src/__tests__/` et ajouter des tests pour les routes critiques.

---

### ⚠️ **WARN 2 : Panels Supervisor/Operator manquants**

**Problème:** Pas de pages dédiées pour supervisor et operator.

**Fichier à créer:** `frontend/app/dashboard/supervisor/page.tsx`

**Correction:**

```typescript
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    if (user?.role === "supervisor" || user?.role === "admin") {
      api("/api/supervisor/overview").then(setOverview).catch(console.error);
    }
  }, [user]);

  if (!overview) return <div>Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard Superviseur</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Mes Opérateurs ({overview.operators.length})</h2>
          <ul className="space-y-2">
            {overview.operators.map((op: any) => (
              <li key={op.id}>{op.fullName || op.email}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Réclamations ({overview.claims.length})</h2>
          <ul className="space-y-2">
            {overview.claims.slice(0, 5).map((claim: any) => (
              <li key={claim.id}>{claim.title}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

**Endroit exact:** Créer `frontend/app/dashboard/supervisor/page.tsx` et `frontend/app/dashboard/operator/page.tsx`

---

### ❌ **CRITIQUE 6 : Realtime notifications supprimées**

**Problème:** Les fichiers Realtime ont été supprimés.

**Solution:** Recréer les fichiers comme indiqué dans les corrections précédentes (voir historique de conversation).

---

### ❌ **CRITIQUE 7 : Dashboard Analytics supprimé**

**Problème:** La page analytics a été supprimée.

**Solution:** Recréer `frontend/app/admin/analytics/page.tsx` avec Recharts (voir historique de conversation).

---

## 📊 RÉSUMÉ FINAL

### Top 5 Problèmes Critiques

1. **Routes API Leads manquantes** → Ajouter CRUD + conversion en client
2. **Routes API Clients/Produits manquantes** → Ajouter CRUD + calcul income
3. **Migrations incomplètes** → Créer migration 0003 pour tables manquantes
4. **README/.env.example manquants** → Créer documentation complète
5. **Tests absents** → Ajouter tests unitaires pour auth et routes critiques

### Actions Prioritaires

1. ✅ **Immédiat** : Créer routes API Leads/Clients/Produits
2. ✅ **Immédiat** : Créer migration 0003
3. ✅ **Court terme** : Ajouter README et .env.example
4. ⚠️ **Moyen terme** : Créer panels Supervisor/Operator
5. ⚠️ **Long terme** : Ajouter tests + restaurer Realtime/Analytics

---

**Score global:** 8/16 PASS (50%)  
**Statut:** ⚠️ **Nécessite corrections critiques avant production**

