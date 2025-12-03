// backend/db/schema.ts
import {
    pgTable,
    serial,
    varchar,
    integer,
    timestamp,
    boolean,
    text,
    jsonb,
    decimal,
    pgEnum,
  } from "drizzle-orm/pg-core";
  
  // ENUM pour les statuts de réclamation
  export const claimStatusEnum = pgEnum("claim_status", [
    "submitted",
    "in_review",
    "resolved",
    "rejected",
  ]);
  
  // ENUM pour les rôles utilisateurs
  export const userRoleEnum = pgEnum("user_role", [
    "admin",
    "supervisor",
    "operator",
    "client",
  ]);
  
  // USERS – Table utilisateurs avec authentification complète
  export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    password: varchar("password", { length: 255 }).notNull(), // Hashé avec bcryptjs
    fullName: varchar("full_name", { length: 255 }),
    role: userRoleEnum("role").notNull().default("client"),
    supervisorId: integer("supervisor_id").references((): any => users.id, {
      onDelete: "set null",
    }),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  });
  
  export const leads = pgTable("leads", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    status: varchar("status", { length: 50 }).default("new"),
    assignedTo: integer("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  });
  
  export const clients = pgTable("clients", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    company: varchar("company", { length: 255 }),
    address: text("address"),
  });
  
  export const products = pgTable("products", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 100 }),
    price: decimal("price", { precision: 12, scale: 2 }),
  });
  
  export const claims = pgTable("claims", {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: claimStatusEnum("status").default("submitted"),
    reply: text("reply"), // Réponse de l'admin/supervisor/operator
    filePaths: jsonb("file_paths").$type<string[]>(), // Chemins des fichiers uploadés
    assignedTo: integer("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }), // Assigné à un opérateur (supervisor only)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  });

  // Fichiers attachés aux réclamations
  export const claimFiles = pgTable("claim_files", {
    id: serial("id").primaryKey(),
    claimId: integer("claim_id")
      .references(() => claims.id, { onDelete: "cascade" })
      .notNull(),
    fileUrl: varchar("file_url", { length: 512 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  });

  // Commentaires sur les réclamations avec visibilité par rôle
  export const claimComments = pgTable("claim_comments", {
    id: serial("id").primaryKey(),
    claimId: integer("claim_id")
      .references(() => claims.id, { onDelete: "cascade" })
      .notNull(),
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    role: userRoleEnum("role").notNull(),
    content: text("content").notNull(),
    visibleToClient: boolean("visible_to_client").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  });

  // TABLE pivot many-to-many entre clients et produits/services
  export const clientProducts = pgTable("client_products", {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    productId: integer("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
  });

  // TABLE des paiements pour calculer le revenu par client / par mois
  export const payments = pgTable("payments", {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paidAt: timestamp("paid_at").defaultNow(),
  });