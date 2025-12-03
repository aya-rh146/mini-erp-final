require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.query(`SELECT unnest(enum_range(NULL::claim_status)) as status`)
  .then(r => {
    console.log('✅ Statuts disponibles dans claim_status:');
    r.rows.forEach(x => console.log('   -', x.status));
    pool.end();
  })
  .catch(e => {
    console.error('❌ Erreur:', e.message);
    pool.end();
  });

