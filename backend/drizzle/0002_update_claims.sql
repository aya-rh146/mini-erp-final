-- Migration pour mettre à jour la table claims
-- Ajouter les nouvelles colonnes et modifier l'enum

-- Ajouter 'rejected' à l'enum claim_status
ALTER TYPE "public"."claim_status" ADD VALUE IF NOT EXISTS 'rejected';

-- Ajouter la colonne reply (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'reply'
    ) THEN
        ALTER TABLE "claims" ADD COLUMN "reply" text;
    END IF;
END $$;

-- Renommer files en file_paths (si files existe)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'files'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'file_paths'
    ) THEN
        ALTER TABLE "claims" RENAME COLUMN "files" TO "file_paths";
    END IF;
END $$;

-- Ajouter file_paths si elle n'existe pas (et files n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND (column_name = 'file_paths' OR column_name = 'files')
    ) THEN
        ALTER TABLE "claims" ADD COLUMN "file_paths" jsonb;
    END IF;
END $$;

-- Supprimer operator_id si elle existe (on utilise assigned_to maintenant)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'operator_id'
    ) THEN
        ALTER TABLE "claims" DROP COLUMN "operator_id";
    END IF;
END $$;

-- Ajouter assigned_to si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE "claims" ADD COLUMN "assigned_to" integer REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;

-- Ajouter updated_at si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "claims" ADD COLUMN "updated_at" timestamp DEFAULT now();
    END IF;
END $$;

