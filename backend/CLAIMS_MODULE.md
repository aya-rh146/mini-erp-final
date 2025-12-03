# 📋 Module Claims Complet

## 📁 Structure de la Table

### Table `claims`

```typescript
{
  id: serial (PK)
  client_id: integer (FK vers users.id)
  title: varchar(255) NOT NULL
  description: text
  status: claim_status ENUM ('submitted', 'in_review', 'resolved', 'rejected') DEFAULT 'submitted'
  reply: text (nullable) // Réponse de l'admin/supervisor/operator
  file_paths: jsonb (array de strings) // Chemins des fichiers uploadés
  assigned_to: integer (FK vers users.id, nullable) // Assigné à un opérateur
  created_at: timestamp DEFAULT now()
  updated_at: timestamp DEFAULT now()
}
```

## 🛣️ Routes API

### `POST /api/claims` (Client only)
Crée une nouvelle réclamation avec upload de fichiers multiples.

**Content-Type:** `multipart/form-data`

**Body:**
- `title` (string, required)
- `description` (string, required)
- `files` (File[], optional) - Max 10 fichiers, 5 Mo chacun, formats: PDF, JPG, PNG

**Réponse:**
```json
{
  "id": 1,
  "clientId": 1,
  "title": "Problème avec le produit",
  "description": "Description détaillée...",
  "status": "submitted",
  "reply": null,
  "filePaths": ["/uploads/claim-1234567890-123456789.pdf"],
  "assignedTo": null,
  "createdAt": "2025-12-02T...",
  "updatedAt": "2025-12-02T..."
}
```

### `GET /api/claims`
Liste les réclamations selon le rôle :
- **Admin/Supervisor/Operator** : Voit toutes les réclamations
- **Client** : Voit seulement ses propres réclamations

**Réponse:**
```json
[
  {
    "id": 1,
    "clientId": 1,
    "title": "Problème avec le produit",
    "description": "...",
    "status": "submitted",
    "reply": null,
    "filePaths": ["/uploads/claim-1234567890-123456789.pdf"],
    "assignedTo": null,
    "createdAt": "2025-12-02T...",
    "updatedAt": "2025-12-02T..."
  }
]
```

### `GET /api/claims/:id`
Récupère une réclamation par ID.

**Permissions:**
- Admin/Supervisor/Operator : Peut voir toutes les réclamations
- Client : Peut voir seulement ses propres réclamations

### `PATCH /api/claims/:id/status` (Admin/Supervisor/Operator)
Met à jour le statut d'une réclamation.

**Body:**
```json
{
  "status": "in_review" // "submitted" | "in_review" | "resolved" | "rejected"
}
```

### `PATCH /api/claims/:id/reply` (Admin/Supervisor/Operator)
Ajoute ou met à jour la réponse à une réclamation.

**Body:**
```json
{
  "reply": "Votre réclamation a été traitée..."
}
```

### `PATCH /api/claims/:id/assign` (Supervisor only)
Assigne une réclamation à un opérateur.

**Body:**
```json
{
  "assignedTo": 2 // ID de l'utilisateur (admin/supervisor/operator)
}
```

ou pour désassigner:
```json
{
  "assignedTo": null
}
```

## 📤 Upload de Fichiers

### Configuration
- **Dossier:** `backend/uploads/`
- **Taille max:** 5 Mo par fichier
- **Nombre max:** 10 fichiers
- **Formats acceptés:** PDF, JPG, PNG

### Accès aux fichiers
Les fichiers sont accessibles via : `http://localhost:3002/uploads/{filename}`

## 🔒 Permissions par Rôle

| Action | Admin | Supervisor | Operator | Client |
|--------|-------|------------|----------|--------|
| Créer réclamation | ❌ | ❌ | ❌ | ✅ |
| Voir toutes les réclamations | ✅ | ✅ | ✅ | ❌ |
| Voir ses propres réclamations | ✅ | ✅ | ✅ | ✅ |
| Modifier le statut | ✅ | ✅ | ✅ | ❌ |
| Ajouter une réponse | ✅ | ✅ | ✅ | ❌ |
| Assigner à un opérateur | ❌ | ✅ | ❌ | ❌ |

## 📝 Migration

Pour appliquer les changements à la base de données :

```bash
cd backend
npm run migrate
```

Ou exécutez manuellement le fichier SQL :
```bash
psql $DATABASE_URL -f drizzle/0002_update_claims.sql
```
