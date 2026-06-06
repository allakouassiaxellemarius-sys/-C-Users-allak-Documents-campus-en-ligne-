# 🚀 GUIDE DE DÉMARRAGE - Campus en Ligne

Bienvenue! Votre site Campus en Ligne a été généré avec succès. Suivez ces étapes pour le configurer et le lancer.

---

## 📋 Étape 1: Installer Node.js

Campus en Ligne nécessite Node.js v18 ou supérieur.

### Windows
1. Visitez https://nodejs.org/
2. Téléchargez la version LTS (Long Term Support)
3. Lancez l'installateur et suivez les étapes
4. Vérifiez l'installation:
   ```
   node --version
   npm --version
   ```

### macOS
```bash
# Avec Homebrew (recommandé)
brew install node
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install nodejs npm
```

---

## 📦 Étape 2: Installer les dépendances

1. Ouvrez un terminal/PowerShell dans ce dossier
2. Exécutez:
   ```
   npm install
   ```

Cela peut prendre 2-5 minutes selon votre connexion.

---

## 🔧 Étape 3: Configuration (optionnel)

Pour utiliser la base de données Supabase:

1. Créez un compte gratuitement sur https://supabase.com
2. Créez un nouveau projet
3. Copiez le fichier `.env.example` en `.env.local`
4. Remplissez les clés:
   - `VITE_SUPABASE_URL` - URL de votre projet
   - `VITE_SUPABASE_ANON_KEY` - Clé anonyme

**Note:** L'application fonctionne aussi sans ces clés en mode démo.

---

## 🎯 Étape 4: Lancer le site

### Mode Développement (avec rechargement automatique)
```
npm run dev
```

Puis ouvrez: **http://localhost:5173**

### Mode Production
```
npm run build
npm run preview
```

---

## 📱 Installation comme PWA

Une fois le site lancé:

1. **Sur votre ordinateur:**
   - Cherchez l'icône d'installation dans la barre d'adresse
   - Cliquez pour installer comme application

2. **Sur Android:**
   - Appuyez sur le menu ⋮
   - Sélectionnez "Installer l'application"

3. **Sur iOS:**
   - Appuyez sur "Partager" 🔗
   - Sélectionnez "Ajouter à l'écran d'accueil"

---

## 🧹 Commandes Utiles

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Builder pour la production
npm run build

# Vérifier la qualité du code
npm run lint

# Prévisualiser la version de production
npm run preview
```

---

## 🌐 Déploiement

### Option 1: Vercel (recommandé - gratuit)
1. Visitez https://vercel.com
2. Connectez votre compte GitHub
3. Importez ce projet
4. Cliquez sur "Deploy"

### Option 2: Netlify
1. Visitez https://netlify.com
2. Cliquez sur "New site from Git"
3. Connectez GitHub et déployez

### Option 3: Docker
```bash
docker-compose up --build
```

---

## 🆘 Dépannage

### Problème: "npm: command not found"
- Node.js n'est pas installé correctement
- Redémarrez votre ordinateur après l'installation

### Problème: "Port 5173 est occupé"
```bash
# Utilisez un port différent
npm run dev -- --port 3001
```

### Problème: Les modules ne s'installent pas
```bash
# Effacez le cache et réinstallez
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Documentation Supplémentaire

- **README.md** - Vue d'ensemble complète du projet
- **vite.config.ts** - Configuration Vite
- **tailwind.config.js** - Configuration Tailwind CSS
- **package.json** - Dépendances du projet

---

## 🎓 Prochaines Étapes

1. ✅ Installez Node.js
2. ✅ Lancez `npm install`
3. ✅ Lancez `npm run dev`
4. ✅ Ouvrez http://localhost:5173
5. ✅ Explorez le site!

---

## 💡 Conseils

- **Mode Développement:** Utilisez `npm run dev` pour développer avec rechargement automatique
- **Modifications CSS:** Les changements Tailwind CSS sont appliqués en direct
- **Types TypeScript:** Vérifiez les erreurs avec le serveur de développement
- **Offline First:** Le site fonctionne aussi sans connexion Internet!

---

## ✨ Besoin d'aide?

- 📖 Consultez le README.md
- 🔗 Visitez https://vite.dev pour Vite
- 🎨 Consultez https://ui.shadcn.com pour les composants UI
- 📚 Consultez https://tailwindcss.com pour Tailwind CSS

---

**Bon développement! 🚀**
