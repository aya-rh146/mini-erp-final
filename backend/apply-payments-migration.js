// Script pour appliquer la migration de la table payments
require("dotenv/config");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function applyMigration() {
  try {
    console.log("🔌 Connexion à la base de données...");
    
    // Vérifier si la table existe déjà
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payments'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log("✅ La table payments existe déjà.");
      await pool.end();
      return;
    }

    console.log("📝 Création de la table payments...");
    
    // Créer la table payments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" serial PRIMARY KEY NOT NULL,
        "client_id" integer NOT NULL,
        "amount" numeric(12, 2) NOT NULL,
        "paid_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // Ajouter la contrainte de clé étrangère
    await pool.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT IF NOT EXISTS "payments_client_id_clients_id_fk"
      FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;
    `);

    console.log("✅ Table payments créée avec succès !");
    await pool.end();
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  }
}

applyMigration();

