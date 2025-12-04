# 🧪 Guide de Test - Module Claims

## 📋 Pages Frontend Créées

### 1. **Liste des Réclamations** - `/claims`
- Affiche toutes les réclamations (selon le rôle)
- Client : voit seulement ses réclamations
- Admin/Supervisor/Operator : voit toutes les réclamations
- Lien vers la création et les détails

### 2. **Créer une Réclamation** - `/claims/create`
- Formulaire avec upload multiple de fichiers
- Validation côté client (taille, type, nombre)
- Upload vers `backend/uploads/`
- Accessible uniquement aux clients

### 3. **Détails d'une Réclamation** - `/claims/[id]`
- Affichage complet de la réclamation
- Téléchargement des fichiers
- **Gestion (Admin/Supervisor/Operator)** :
  - Modifier le statut
  - Ajouter une réponse
- **Assignation (Supervisor only)** :
  - Assigner à un opérateur

## 🚀 Comment Tester

### Étape 1 : Démarrer les Serveurs

**Terminal 1 - Backend:**
```powershell
cd mini-erp-final\backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd mini-erp-final\frontend
npm run dev
```

### Étape 2 : Se Connecter

1. Ouvrez http://localhost:3000
2. Connectez-vous avec :
   - **Email :** `admin@erp.com`
   - **Mot de passe :** `password`

### Étape 3 : Créer un Utilisateur Client (Admin)

1. Allez sur `/dashboard/users` (si la page existe)
2. Ou utilisez l'API directement :
   ```bash
   curl -X POST http://localhost:3002/api/users \
     -H "Content-Type: application/json" \
     -H "Cookie: token=<VOTRE_TOKEN>" \
     -d '{
       "email": "client@test.com",
       "password": "test123",
       "fullName": "Client Test",
       "role": "client"
     }'
   ```

### Étape 4 : Tester la Création de Réclamation (Client)

1. **Déconnectez-vous** et **reconnectez-vous** avec le compte client
2. Allez sur `/claims/create`
3. Remplissez le formulaire :
   - Titre : "Problème avec le produit X"
   - Description : "Description détaillée du problème..."
   - Fichiers : Sélectionnez 1-3 fichiers (PDF, JPG, PNG, max 5 Mo chacun)
4. Cliquez sur "Créer la réclamation"
5. Vous devriez être redirigé vers `/claims` avec votre nouvelle réclamation

### Étape 5 : Tester la Gestion (Admin/Supervisor/Operator)

1. **Reconnectez-vous** avec le compte admin
2. Allez sur `/claims` ou `/dashboard/claims`
3. Cliquez sur une réclamation pour voir les détails
4. **Modifier le statut :**
   - Sélectionnez un nouveau statut dans le menu déroulant
   - Cliquez sur "Mettre à jour"
5. **Ajouter une réponse :**
   - Écrivez une réponse dans le champ texte
   - Cliquez sur "Envoyer la réponse"
6. Vérifiez que les changements sont sauvegardés

### Étape 6 : Tester l'Upload de Fichiers

1. Créez une réclamation avec plusieurs fichiers
2. Vérifiez que les fichiers apparaissent dans la liste
3. Cliquez sur un fichier pour le télécharger
4. Vérifiez que les fichiers sont dans `backend/uploads/`

## 🔍 Tests API Directs

### Créer une Réclamation (avec fichiers)

```bash
# Créer un fichier test
echo "Test content" > test.txt

# Créer FormData et envoyer
curl -X POST http://localhost:3002/api/claims \
  -H "Cookie: token=<TOKEN_CLIENT>" \
  -F "title=Test Réclamation" \
  -F "description=Description de test" \
  -F "files=@test.txt"
```

### Lister les Réclamations

```bash
curl http://localhost:3002/api/claims \
  -H "Cookie: token=<TOKEN>"
```

### Modifier le Statut

```bash
curl -X PATCH http://localhost:3002/api/claims/1/status \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<TOKEN_ADMIN>" \
  -d '{"status": "in_review"}'
```

### Ajouter une Réponse

```bash
curl -X PATCH http://localhost:3002/api/claims/1/reply \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<TOKEN_ADMIN>" \
  -d '{"reply": "Votre réclamation a été traitée avec succès."}'
```

### Assigner à un Opérateur (Supervisor)

```bash
curl -X PATCH http://localhost:3002/api/claims/1/assign \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<TOKEN_SUPERVISOR>" \
  -d '{"assignedTo": 2}'
```

## ✅ Checklist de Test

- [ ] Créer une réclamation en tant que client
- [ ] Upload de fichiers multiples fonctionne
- [ ] Voir la liste des réclamations (client)
- [ ] Voir la liste de toutes les réclamations (admin)
- [ ] Voir les détails d'une réclamation
- [ ] Télécharger les fichiers uploadés
- [ ] Modifier le statut (admin/supervisor/operator)
- [ ] Ajouter une réponse (admin/supervisor/operator)
- [ ] Assigner à un opérateur (supervisor)
- [ ] Vérifier les permissions par rôle

## 🐛 Problèmes Courants

### Les fichiers ne s'affichent pas
- Vérifiez que le dossier `backend/uploads/` existe
- Vérifiez que les fichiers sont bien uploadés
- Vérifiez l'URL dans `filePaths` (doit commencer par `/uploads/`)

### Erreur 401 Unauthorized
- Vérifiez que vous êtes connecté
- Vérifiez que le cookie JWT est présent
- Reconnectez-vous si nécessaire

### Erreur 403 Forbidden
- Vérifiez votre rôle utilisateur
- Seuls les clients peuvent créer des réclamations
- Seuls admin/supervisor/operator peuvent gérer

### Les fichiers ne se téléchargent pas
- Vérifiez que le backend sert les fichiers statiques sur `/uploads/*`
- Vérifiez que l'URL est correcte : `http://localhost:3002/uploads/filename`

## 📝 Notes

- Les fichiers sont stockés dans `backend/uploads/`
- Les chemins sont sauvegardés dans `file_paths` (JSON array)
- Le statut par défaut est `submitted`
- Seuls les clients peuvent créer des réclamations
- Les admins/supervisors/operators peuvent modifier le statut et ajouter des réponses
- Seuls les supervisors peuvent assigner des réclamations






