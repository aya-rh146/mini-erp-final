# 🔐 Système d'Authentification Complet

## 📋 Vue d'ensemble

Système d'authentification complet avec 4 rôles hiérarchiques :
- **admin** : Accès complet, peut gérer tous les utilisateurs
- **supervisor** : Accès étendu, peut superviser les opérateurs
- **operator** : Accès opérationnel
- **client** : Accès limité à ses propres données

## 🔑 Fonctionnalités

- ✅ Authentification JWT stockée dans cookie HttpOnly
- ✅ Mot de passe hashé avec bcryptjs (10 rounds)
- ✅ Middleware d'authentification avec vérification de l'utilisateur actif
- ✅ Middleware de vérification de rôle (`requireRole`)
- ✅ CRUD complet des utilisateurs (admin only)
- ✅ Vérification que l'utilisateur existe et est actif à chaque requête

## 📁 Structure du Schéma

### Table `users`

```typescript
{
  id: serial (PK)
  email: varchar(255) UNIQUE NOT NULL
  password: varchar(255) NOT NULL (hashé avec bcryptjs)
  full_name: varchar(255)
  role: user_role ENUM ('admin', 'supervisor', 'operator', 'client') DEFAULT 'client'
  supervisor_id: integer (FK vers users.id)
  active: boolean DEFAULT true
  created_at: timestamp DEFAULT now()
}
```

### Enum `user_role`

```sql
CREATE TYPE "public"."user_role" AS ENUM('admin', 'supervisor', 'operator', 'client');
```

## 🛣️ Routes API

### Routes Publiques

#### `POST /api/auth/login`
Authentifie un utilisateur et retourne un JWT dans un cookie HttpOnly.

**Body:**
```json
{
  "email": "admin@erp.com",
  "password": "password"
}
```

**Réponse:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "role": "admin",
    "name": "Administrateur",
    "email": "admin@erp.com"
  }
}
```

**Cookie:** `token=<JWT>` (HttpOnly, 7 jours)

#### `POST /api/auth/logout`
Déconnecte l'utilisateur en supprimant le cookie.

**Réponse:**
```json
{
  "success": true,
  "message": "Déconnecté avec succès"
}
```

#### `POST /api/init`
Crée l'administrateur par défaut (une seule fois).

**Réponse:**
```json
{
  "success": true,
  "message": "Administrateur créé avec succès",
  "user": { ... },
  "credentials": {
    "email": "admin@erp.com",
    "password": "password"
  }
}
```

### Routes Protégées

#### `GET /api/me`
Retourne les informations de l'utilisateur connecté.

**Headers:** Cookie avec token JWT

**Réponse:**
```json
{
  "id": 1,
  "role": "admin",
  "name": "Administrateur",
  "email": "admin@erp.com"
}
```

### Routes Admin (Admin Only)

#### `GET /api/users`
Liste tous les utilisateurs.

**Réponse:**
```json
[
  {
    "id": 1,
    "email": "admin@erp.com",
    "fullName": "Administrateur",
    "role": "admin",
    "supervisorId": null,
    "active": true,
    "createdAt": "2025-12-02T..."
  },
  ...
]
```

#### `GET /api/users/:id`
Récupère un utilisateur par ID.

**Réponse:**
```json
{
  "id": 1,
  "email": "admin@erp.com",
  "fullName": "Administrateur",
  "role": "admin",
  "supervisorId": null,
  "active": true,
  "createdAt": "2025-12-02T..."
}
```

#### `POST /api/users`
Crée un nouvel utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe",
  "role": "client",
  "supervisorId": 1,
  "active": true
}
```

**Réponse:** 201 Created
```json
{
  "id": 2,
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "client",
  "supervisorId": 1,
  "active": true,
  "createdAt": "2025-12-02T..."
}
```

#### `PUT /api/users/:id`
Met à jour un utilisateur.

**Body:**
```json
{
  "email": "newemail@example.com",
  "fullName": "Jane Doe",
  "role": "operator",
  "supervisorId": 1,
  "active": true,
  "password": "newPassword123" // Optionnel
}
```

**Réponse:**
```json
{
  "id": 2,
  "email": "newemail@example.com",
  "fullName": "Jane Doe",
  "role": "operator",
  "supervisorId": 1,
  "active": true,
  "createdAt": "2025-12-02T..."
}
```

#### `DELETE /api/users/:id`
Supprime un utilisateur.

**Réponse:**
```json
{
  "success": true,
  "message": "Utilisateur supprimé avec succès"
}
```

**Note:** Impossible de supprimer le dernier administrateur.

## 🔒 Middlewares

### `authenticate`
Vérifie le token JWT dans les cookies et charge l'utilisateur depuis la DB.

- Vérifie que le token existe
- Vérifie que le token est valide
- Vérifie que l'utilisateur existe et est actif
- Charge les données utilisateur dans `c.set("user")`

### `requireRole(allowedRoles: UserRole[])`
Vérifie que l'utilisateur a un des rôles autorisés.

**Exemples:**
- `requireRole(["admin"])` - Seul l'admin
- `requireRole(["admin", "supervisor"])` - Admin ou supervisor
- `requireRole(["admin", "supervisor", "operator"])` - Admin, supervisor ou operator

**Middlewares prédéfinis:**
- `requireAdmin` - Seul l'admin
- `requireSupervisor` - Admin ou supervisor
- `requireOperator` - Admin, supervisor ou operator
- `requireClient` - Seul le client

## 🔐 Sécurité

### JWT
- Secret stocké dans `JWT_SECRET` (variable d'environnement)
- Expiration : 7 jours
- Stocké dans cookie HttpOnly (non accessible via JavaScript)
- SameSite=Lax pour protection CSRF

### Mot de passe
- Hashé avec bcryptjs (10 rounds)
- Jamais retourné dans les réponses API
- Vérifié à chaque connexion

### Vérifications
- Utilisateur doit être actif (`active = true`)
- Utilisateur doit exister dans la DB
- Rôle vérifié à chaque requête protégée

## 📝 Exemples d'utilisation

### Créer un utilisateur (Admin)

```bash
curl -X POST http://localhost:3002/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<JWT_TOKEN>" \
  -d '{
    "email": "operator@erp.com",
    "password": "secure123",
    "fullName": "Opérateur Test",
    "role": "operator",
    "supervisorId": 1
  }'
```

### Se connecter

```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@erp.com",
    "password": "password"
  }'
```

### Récupérer les infos utilisateur

```bash
curl http://localhost:3002/api/me \
  -H "Cookie: token=<JWT_TOKEN>"
```

### Lister les utilisateurs (Admin)

```bash
curl http://localhost:3002/api/users \
  -H "Cookie: token=<JWT_TOKEN>"
```

## 🚀 Migration

Les migrations ont été générées et appliquées automatiquement :

```sql
-- Fichier: drizzle/0001_open_nightshade.sql
CREATE TYPE "public"."user_role" AS ENUM('admin', 'supervisor', 'operator', 'client');
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'client'::"public"."user_role";
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";
```

## ✅ Tests

Pour tester le système :

1. **Créer l'admin par défaut:**
   ```bash
   curl -X POST http://localhost:3002/api/init
   ```

2. **Se connecter:**
   ```bash
   curl -X POST http://localhost:3002/api/auth/login \
     -H "Content-Type: application/json" \
     -c cookies.txt \
     -d '{"email":"admin@erp.com","password":"password"}'
   ```

3. **Récupérer les infos:**
   ```bash
   curl http://localhost:3002/api/me -b cookies.txt
   ```

4. **Créer un utilisateur:**
   ```bash
   curl -X POST http://localhost:3002/api/users \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{"email":"test@test.com","password":"test123","role":"client"}'
   ```

## 📚 Code Source

- **Schéma:** `backend/db/schema.ts`
- **API:** `backend/src/index.ts`
- **Migrations:** `backend/drizzle/0001_open_nightshade.sql`

