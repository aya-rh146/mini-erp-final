# 🚀 Commandes pour Démarrer le Projet

## ⚠️ IMPORTANT : Configuration d'abord !

### 1. Créer le fichier `backend/.env`

Créez un fichier `.env` dans le dossier `backend/` avec ce contenu :

```env
DATABASE_URL=postgresql://votre_user:votre_password@votre_host.neon.tech:5432/votre_db?sslmode=require
JWT_SECRET=votre_secret_jwt_super_long_et_securise_minimum_32_caracteres
```

**Remplacez :**
- `votre_user`, `votre_password`, `votre_host`, `votre_db` par vos vraies valeurs Neon
- `votre_secret_jwt...` par une clé secrète forte

---

## 📦 Installation (une seule fois)

```powershell
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

---

## ▶️ DÉMARRAGE

### Terminal 1 - Backend (PORT 3002)
```powershell
cd backend
npm run dev
```

**Vous devriez voir :**
```
Mini ERP API → http://localhost:3002
```

### Terminal 2 - Frontend (PORT 3000)
```powershell
cd frontend
npm run dev
```

**Vous devriez voir :**
```
  ▲ Next.js 16.0.6
  - Local:        http://localhost:3000
```

---

## ✅ Vérification

1. **Backend :** Ouvrez http://localhost:3002
   - Devrait afficher : `Mini ERP API – 100% KHADDAM !`

2. **Frontend :** Ouvrez http://localhost:3000
   - Devrait rediriger vers `/login`

3. **Login :**
   - Email : `admin@erp.com`
   - Mot de passe : `password`

---

## 🐛 Si le backend ne démarre pas

### Erreur : "Cannot find module 'dotenv'"
```powershell
cd backend
npm install dotenv
```

### Erreur : "Connection refused" sur le port 3002
- Vérifiez que le backend est bien démarré
- Vérifiez que le port  n'est pas utilisé par un autre programme

### Erreur : "DATABASE_URL is not defined"
- Vérifiez que `backend/.env` existe
- Vérifiez que `DATABASE_URL` est bien défini dans le fichier

---

## 📝 Commandes Utiles

```powershell
# Voir les processus sur le port 3002
Get-NetTCPConnection -LocalPort 3002

# Arrêter tous les processus Node.js
Get-Process -Name node | Stop-Process
```

