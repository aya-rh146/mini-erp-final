// Script pour créer des clients de test et des paiements
// Usage: node create-payments-with-clients.js

require("dotenv/config");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createPaymentsWithClients() {
  try {
    console.log("🔌 Connexion à la base de données...");
    
    // Vérifier si des clients existent déjà
    let clientsCheck = await pool.query("SELECT id FROM clients ORDER BY id LIMIT 2");
    let clientIds = clientsCheck.rows.map(c => c.id);

    // Si moins de 2 clients, créer des clients de test
    if (clientIds.length < 2) {
      console.log("📝 Création de clients de test...");
      
      // Vérifier si des utilisateurs existent
      let usersCheck = await pool.query("SELECT id, email FROM users WHERE role = 'client' LIMIT 2");
      
      if (usersCheck.rows.length === 0) {
        // Créer des utilisateurs clients
        const hashedPassword = bcrypt.hashSync("password123", 10);
        const user1 = await pool.query(
          `INSERT INTO users (email, password, full_name, role) 
           VALUES ('client1@test.com', $1, 'Client Test 1', 'client') 
           RETURNING id`,
          [hashedPassword]
        );
        const user2 = await pool.query(
          `INSERT INTO users (email, password, full_name, role) 
           VALUES ('client2@test.com', $1, 'Client Test 2', 'client') 
           RETURNING id`,
          [hashedPassword]
        );
        
        // Créer les clients
        const client1 = await pool.query(
          `INSERT INTO clients (user_id, company) 
           VALUES ($1, 'Entreprise Test 1') 
           RETURNING id`,
          [user1.rows[0].id]
        );
        const client2 = await pool.query(
          `INSERT INTO clients (user_id, company) 
           VALUES ($1, 'Entreprise Test 2') 
           RETURNING id`,
          [user2.rows[0].id]
        );
        
        clientIds = [client1.rows[0].id, client2.rows[0].id];
        console.log("✅ Clients de test créés:", clientIds);
      } else {
        // Utiliser les utilisateurs existants
        for (const user of usersCheck.rows) {
          const clientCheck = await pool.query("SELECT id FROM clients WHERE user_id = $1", [user.id]);
          if (clientCheck.rows.length === 0) {
            const newClient = await pool.query(
              `INSERT INTO clients (user_id, company) 
               VALUES ($1, 'Entreprise Test') 
               RETURNING id`,
              [user.id]
            );
            clientIds.push(newClient.rows[0].id);
          } else {
            clientIds.push(clientCheck.rows[0].id);
          }
        }
        
        // Si toujours moins de 2, utiliser le premier pour les deux
        if (clientIds.length < 2) {
          clientIds.push(clientIds[0]);
        }
        console.log("✅ Clients trouvés/créés:", clientIds);
      }
    } else {
      console.log("✅ Clients existants trouvés:", clientIds);
    }

    const client1 = clientIds[0];
    const client2 = clientIds.length > 1 ? clientIds[1] : clientIds[0];

    // Vérifier si des paiements existent déjà pour éviter les doublons
    const existingPayments = await pool.query("SELECT COUNT(*) as count FROM payments");
    if (parseInt(existingPayments.rows[0].count) > 0) {
      console.log("⚠️  Des paiements existent déjà. Voulez-vous les ajouter quand même ?");
      console.log("💡 Pour réinitialiser, supprimez d'abord: DELETE FROM payments;");
    }

    // Insérer les paiements
    console.log("📝 Insertion des paiements...");
    const insertQuery = `
      INSERT INTO payments (client_id, amount, paid_at) 
      VALUES 
        (${client1}, 1000.00, '2025-01-15'),
        (${client1}, 2000.00, '2025-02-20'),
        (${client2}, 1500.00, '2025-03-10'),
        (${client2}, 3000.00, '2025-04-05')
      RETURNING id, client_id, amount, paid_at;
    `;

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
    console.log("\n✅ Terminé ! Le graphique CA mensuel devrait maintenant afficher des données.");
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    if (error.code === "23503") {
      console.error("💡 Vérifiez que les clients existent.");
    } else if (error.code === "23505") {
      console.error("💡 Des données existent déjà. Utilisez DELETE FROM payments; pour réinitialiser.");
    }
    console.error(error);
    process.exit(1);
  }
}

createPaymentsWithClients();

