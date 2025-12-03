# 🏢 Mini ERP - Système de Gestion Complet

Système ERP complet avec gestion des utilisateurs, leads, clients, produits/services, et réclamations.

## 📋 Fonctionnalités

- ✅ **Authentification sécurisée** : JWT + bcryptjs, rôles hiérarchiques
- ✅ **Gestion des utilisateurs** : Admin, Supervisor, Operator, Client
- ✅ **Gestion des leads** : CRUD, assignation, conversion en client
- ✅ **Gestion des clients** : Profil complet, produits assignés, calcul de revenu
- ✅ **Gestion des produits/services** : CRUD, assignation many-to-many
- ✅ **Module réclamations** : Création, upload fichiers, workflow statuts, assignation, commentaires
- ✅ **Portail client** : Interface dédiée pour les clients
- ✅ **Dashboards** : Admin, Supervisor, Operator, Client
- ✅ **RBAC complet** : Middlewares de sécurité côté serveur

## 🚀 Installation

### Prérequis

- Node.js 18+
- PostgreSQL (recommandé : [Neon](https://neon.tech))
- Supabase (optionnel, pour Realtime)

### Backend

```bash
cd backend
npm install

# Créer le fichier .env (voir .env.example)
cp .env.example .env
# Puis remplir les variables d'environnement

# Appliquer les migrations
npm run migrate

# Démarrer le serveur
npm run dev
```

Le backend sera accessible sur `http://localhost:3002`

### Frontend

```bash
cd frontend
npm install

# Créer le fichier .env.local (voir .env.example)
cp .env.example .env.local
# Puis remplir les variables d'environnement

# Démarrer le serveur de développement
npm run dev
```

Le frontend sera accessible sur `http://localhost:3000`

## 🔐 Configuration

### Variables d'environnement Backend (`.env`)

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=development
```

### Variables d'environnement Frontend (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 👥 Rôles et Permissions

### Admin
- Accès complet au système
- Gestion de tous les utilisateurs
- Gestion de tous les leads, clients, produits
- Gestion de toutes les réclamations

### Supervisor
- Gestion des opérateurs assignés
- Vue sur les leads et réclamations de ses opérateurs
- Assignation de réclamations aux opérateurs
- Conversion de leads en clients

### Operator
- Gestion des leads assignés
- Gestion des réclamations assignées
- Mise à jour des statuts et réponses

### Client
- Portail client dédié
- Création et suivi de ses réclamations
- Vue de ses produits/services assignés
- Vue de son revenu total

## 📚 Documentation

- `backend/AUTHENTICATION.md` : Documentation complète du système d'authentification
- `backend/CLAIMS_MODULE.md` : Documentation du module réclamations
- `GUIDE_TEST_CLAIMS.md` : Guide de test du module réclamations
- `AUDIT_REPORT.md` : Rapport d'audit complet du projet

## 🗄️ Structure de la Base de Données

### Tables principales

- `users` : Utilisateurs avec rôles et hiérarchie
- `leads` : Prospects à convertir
- `clients` : Clients avec profils complets
- `products` : Produits/services disponibles
- `client_products` : Relation many-to-many clients ↔ produits
- `payments` : Paiements pour calcul du revenu
- `claims` : Réclamations des clients
- `claim_files` : Fichiers attachés aux réclamations
- `claim_comments` : Commentaires sur les réclamations

## 🔄 Migrations

Les migrations sont gérées avec Drizzle ORM :

```bash
cd backend
npm run migrate
```

Les migrations se trouvent dans `backend/drizzle/` :
- `0000_*.sql` : Tables initiales
- `0001_*.sql` : Enum user_role
- `0002_*.sql` : Mise à jour claims
- `0003_*.sql` : Tables manquantes (claim_files, claim_comments, client_products, payments)

## 🧪 Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📦 Scripts Disponibles

### Backend

- `npm run dev` : Démarrer en mode développement
- `npm run start` : Démarrer en mode production
- `npm run migrate` : Générer et appliquer les migrations
- `npm run test-db` : Tester la connexion à la base de données

### Frontend

- `npm run dev` : Démarrer en mode développement
- `npm run build` : Construire pour la production
- `npm run start` : Démarrer en mode production
- `npm run lint` : Linter le code

## 🚢 Déploiement

### Backend

Le backend peut être déployé sur :
- Vercel (serverless)
- Railway
- Render
- Tout serveur Node.js

### Frontend

Le frontend peut être déployé sur :
- Vercel (recommandé pour Next.js)
- Netlify
- Tout serveur supportant Next.js

## 🐛 Dépannage

### Erreur de connexion à la base de données

1. Vérifier que `DATABASE_URL` est correct dans `.env`
2. Vérifier que la base de données est accessible
3. Exécuter `npm run test-db` pour diagnostiquer

### Erreur "tables n'existent pas"

1. Exécuter `npm run migrate` dans le dossier backend
2. Vérifier que toutes les migrations ont été appliquées

### Erreur JWT

1. Vérifier que `JWT_SECRET` est défini dans `.env`
2. Vérifier que le secret est suffisamment long et sécurisé

## 📝 Licence

ISC

## 👨‍💻 Auteur

Projet développé avec l'aide d'une IA (ChatGPT) pour la démonstration.

---

**Note :** Ce projet est un système ERP complet et fonctionnel. Assurez-vous de configurer correctement les variables d'environnement avant le déploiement en production.

