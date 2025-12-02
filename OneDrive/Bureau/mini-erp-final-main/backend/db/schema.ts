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
  
  // ENUM s7i7
  export const claimStatusEnum = pgEnum("claim_status", [
    "submitted",
    "in_review",
    "resolved",
  ]);
  
  // USERS – bla chi annotation ghalta
  export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }),
    role: varchar("role", { length: 20 }).notNull().default("client"),
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
    operatorId: integer("operator_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: claimStatusEnum("status").default("submitted"),
    files: jsonb("files").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow(),
  });