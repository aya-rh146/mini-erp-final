// Script pour appliquer la migration claims
require('dotenv').config();
const { Pool } = require('pg');
const { readFileSync } = require('fs');
const { join } = require('path');

async function applyMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL n\'est pas défini dans .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔍 Connexion à la base de données...');
    const client = await pool.connect();
    console.log('✅ Connecté à la base de données\n');

    // Lire le fichier SQL
    const sqlFile = join(__dirname, 'drizzle', '0002_update_claims.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    console.log('📝 Application de la migration...');
    await client.query(sql);
    console.log('✅ Migration appliquée avec succès !\n');

    // Vérifier la structure de la table
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'claims'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Structure de la table claims:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
    });

    client.release();
    await pool.end();
    console.log('\n✅ Migration terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    if (error.code === '42710') {
      console.log('ℹ️  Certaines colonnes existent déjà, c\'est normal.');
    }
    process.exit(1);
  }
}

applyMigration();

