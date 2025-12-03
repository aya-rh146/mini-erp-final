// Script pour créer des paiements de test
// Usage: node create-payments.js

require("dotenv/config");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createPayments() {
  try {
    console.log("🔌 Connexion à la base de données...");
    
    // Vérifier que les clients existent
    const clientsCheck = await pool.query("SELECT id FROM clients ORDER BY id LIMIT 2");
    if (clientsCheck.rows.length === 0) {
      console.error("❌ Erreur: Aucun client trouvé dans la base de données.");
      console.log("💡 Créez d'abord des clients via l'interface ou l'API.");
      process.exit(1);
    }

    const clientIds = clientsCheck.rows.map(c => c.id);
    console.log("✅ Clients trouvés:", clientIds);

    // Utiliser les IDs des clients existants
    const client1 = clientIds[0];
    const client2 = clientIds.length > 1 ? clientIds[1] : clientIds[0]; // Utiliser le même client si un seul existe

    // Insérer les paiements
    const insertQuery = `
      INSERT INTO payments (client_id, amount, paid_at) 
      VALUES 
        (${client1}, 1000.00, '2025-01-15'),
        (${client1}, 2000.00, '2025-02-20'),
        (${client2}, 1500.00, '2025-03-10'),
        (${client2}, 3000.00, '2025-04-05')
      RETURNING id, client_id, amount, paid_at;
    `;

    console.log("📝 Insertion des paiements...");
    const result = await pool.query(insertQuery);

    console.log("✅ Paiements créés avec succès !");
    console.log("\n📊 Résumé:");
    result.rows.forEach((payment, index) => {
      console.log(`  ${index + 1}. Client ${payment.client_id} - ${payment.amount}€ - ${payment.paid_at.toISOString().split('T')[0]}`);
    });

    // Afficher le total par mois
    const monthlyQuery = `
      SELECT 
        to_char(date_trunc('month', paid_at), 'YYYY-MM') as month,
        SUM(amount)::numeric as total
      FROM payments
      GROUP BY 1
      ORDER BY 1;
    `;

    const monthlyResult = await pool.query(monthlyQuery);
    console.log("\n💰 Revenu mensuel:");
    monthlyResult.rows.forEach((row) => {
      console.log(`  ${row.month}: ${parseFloat(row.total).toFixed(2)}€`);
    });

    await pool.end();
    console.log("\n✅ Terminé !");
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    if (error.code === "23503") {
      console.error("💡 Vérifiez que les clients avec les IDs 1 et 2 existent.");
    }
    process.exit(1);
  }
}

createPayments();

