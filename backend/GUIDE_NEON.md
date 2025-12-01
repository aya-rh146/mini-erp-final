# 🔗 Guide : Récupérer la Connection String depuis Neon

## 📋 Étapes détaillées

### **Étape 1 : Se connecter à Neon**
1. Allez sur https://console.neon.tech
2. Connectez-vous avec votre compte (email/mot de passe)

### **Étape 2 : Accéder à votre projet**
1. Dans le dashboard, vous verrez la liste de vos projets
2. Cliquez sur le projet que vous voulez utiliser (ou créez-en un nouveau si nécessaire)

### **Étape 3 : Récupérer la Connection String**
1. Dans votre projet, cherchez la section **"Connection Details"** ou **"Connection String"**
2. Vous verrez plusieurs options :
   - **Pooled connection** (recommandé pour la production)
   - **Direct connection** (pour le développement)
3. Cliquez sur **"Direct connection"** ou **"Connection string"**
4. Vous verrez quelque chose comme :
   ```
   postgresql://username:password@ep-xxxxx-xxxxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### **Étape 4 : Copier la Connection String**
1. Cliquez sur le bouton **"Copy"** à côté de la connection string
2. La chaîne complète sera copiée dans votre presse-papiers

### **Étape 5 : Mettre à jour le fichier .env**
1. Ouvrez le fichier `backend/.env` dans votre éditeur
2. Remplacez la ligne `DATABASE_URL=...` par :
   ```
   DATABASE_URL=votre_connection_string_copiée
   ```
3. **Important** : Assurez-vous que la ligne est complète et sur une seule ligne (pas de retour à la ligne au milieu)

### **Étape 6 : Vérifier**
1. Sauvegardez le fichier `.env`
2. Exécutez dans le terminal :
   ```powershell
   npm run migrate
   ```
3. Si tout est correct, vous verrez :
   ```
   [✓] Pushing schema to database...
   ```

## ⚠️ Problèmes courants

### **Problème : "password authentication failed"**
- **Solution** : Vérifiez que vous avez copié la connection string complète
- Assurez-vous que le mot de passe n'a pas été tronqué

### **Problème : "Connection refused"**
- **Solution** : Vérifiez que votre base de données Neon est active (pas en pause)
- Certaines bases de données gratuites se mettent en pause après inactivité

### **Problème : Le fichier .env ne se charge pas**
- **Solution** : Vérifiez que le fichier s'appelle exactement `.env` (avec le point au début)
- Vérifiez qu'il est dans le dossier `backend/`

## 🔐 Sécurité

⚠️ **Important** : Ne partagez jamais votre connection string publiquement !
- Ne la commitez pas dans Git (elle devrait être dans `.gitignore`)
- Ne la partagez pas dans des messages publics

## 📝 Exemple de fichier .env correct

```env
DATABASE_URL=postgresql://username:password@ep-xxxxx-xxxxx.region.aws.neon.tech/dbname?sslmode=require
JWT_SECRET=votre_secret_jwt_super_long_et_securise_minimum_32_caracteres
```

---

**Une fois que vous avez mis à jour le fichier .env, dites-moi et je vous aiderai à tester la connexion !** ✅

