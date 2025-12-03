// Script de test de connexion à la base de données
require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Test de connexion à la base de données...\n');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL n\'est pas défini dans .env');
  process.exit(1);
}

// Masquer le mot de passe dans l'affichage
const dbUrl = process.env.DATABASE_URL;
const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
console.log(`📋 Connection string: ${maskedUrl}`);
console.log(`📏 Longueur: ${dbUrl.length} caractères\n`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Tester la connexion
pool.connect()
  .then((client) => {
    console.log('✅ Connexion réussie !\n');
    
    // Tester une requête simple
    return client.query('SELECT version()')
      .then((res) => {
        console.log('✅ Requête test réussie');
        console.log(`📊 Version PostgreSQL: ${res.rows[0].version.split(' ')[0]} ${res.rows[0].version.split(' ')[1]}\n`);
        
        // Vérifier si les tables existent
        return client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `);
      })
      .then((res) => {
        if (res.rows.length === 0) {
          console.log('⚠️  Aucune table trouvée dans la base de données');
          console.log('💡 Exécutez: npm run migrate\n');
        } else {
          console.log(`✅ ${res.rows.length} table(s) trouvée(s):`);
          res.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
          });
          console.log('');
        }
        
        client.release();
        pool.end();
        console.log('✅ Test terminé avec succès');
        process.exit(0);
      });
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion:\n');
    console.error(`Code: ${err.code}`);
    console.error(`Message: ${err.message}\n`);
    
    if (err.code === '28P01') {
      console.error('🔴 PROBLÈME: Erreur d\'authentification');
      console.error('💡 Solutions possibles:');
      console.error('   1. Vérifiez que le mot de passe dans DATABASE_URL est correct');
      console.error('   2. Allez sur https://console.neon.tech et récupérez une nouvelle connection string');
      console.error('   3. Assurez-vous que le mot de passe n\'a pas été tronqué lors du copier-coller');
      console.error('   4. Si le mot de passe contient des caractères spéciaux, vérifiez l\'encodage\n');
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      console.error('🔴 PROBLÈME: Impossible de se connecter au serveur');
      console.error('💡 Solutions possibles:');
      console.error('   1. Vérifiez que votre base de données Neon est active (pas en pause)');
      console.error('   2. Vérifiez que l\'URL dans DATABASE_URL est correcte');
      console.error('   3. Vérifiez votre connexion internet\n');
    } else {
      console.error('💡 Consultez GUIDE_NEON.md pour plus d\'informations\n');
    }
    
    pool.end();
    process.exit(1);
  });

