-- Migration 0003 : Ajouter les tables manquantes
-- Généré avec l'aide d'une IA (ChatGPT) pour compléter le schéma de base de données

-- Table claim_files
CREATE TABLE IF NOT EXISTS "claim_files" (
  "id" serial PRIMARY KEY NOT NULL,
  "claim_id" integer NOT NULL,
  "file_url" varchar(512) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "claim_files"
  ADD CONSTRAINT IF NOT EXISTS "claim_files_claim_id_claims_id_fk"
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
  ADD CONSTRAINT IF NOT EXISTS "claim_comments_claim_id_claims_id_fk"
  FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;

ALTER TABLE "claim_comments"
  ADD CONSTRAINT IF NOT EXISTS "claim_comments_author_id_users_id_fk"
  FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Table client_products (many-to-many)
CREATE TABLE IF NOT EXISTS "client_products" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "product_id" integer NOT NULL,
  UNIQUE("client_id", "product_id")
);

ALTER TABLE "client_products"
  ADD CONSTRAINT IF NOT EXISTS "client_products_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

ALTER TABLE "client_products"
  ADD CONSTRAINT IF NOT EXISTS "client_products_product_id_products_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

-- Table payments
CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "paid_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "payments"
  ADD CONSTRAINT IF NOT EXISTS "payments_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

