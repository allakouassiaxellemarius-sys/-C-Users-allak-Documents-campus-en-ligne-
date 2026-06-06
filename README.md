# Campus en Ligne - Plateforme Universitaire

## 📋 À propos

Campus en Ligne est une plateforme universitaire complète pour gérer votre emploi du temps, vos cours, vos notes et vos collaborations. C'est une application React/TypeScript moderne avec support PWA (Progressive Web App) et mode hors ligne.

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js** v18 ou supérieur ([télécharger ici](https://nodejs.org/))
- **npm** ou **yarn** (inclus avec Node.js)
- Git (optionnel)

### Installation

1. **Installer les dépendances:**

```bash
npm install
# ou
yarn install
```

2. **Configuration Supabase (optionnel)**

Créez un fichier `.env.local` à la racine du projet:

```env
VITE_SUPABASE_URL=https://votre-project.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anonyme
```

Vous pouvez obtenir ces clés sur [supabase.com](https://supabase.com)

### Développement

Démarrer le serveur de développement:

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

### Build pour la production

```bash
npm run build
```

Les fichiers compilés seront dans le dossier `dist/`

### Vérifier la qualité du code

```bash
npm run lint
```

## 📁 Structure du Projet

```
campus-en-ligne/
├── src/
│   ├── components/        # Composants réutilisables
│   │   ├── ui/           # Composants d'interface (shadcn/ui)
│   │   ├── common/       # Composants partagés
│   │   ├── layouts/      # Mises en page
│   │   └── ...
│   ├── pages/            # Pages de l'application
│   ├── contexts/         # Context API (Auth, Theme)
│   ├── hooks/            # Hooks React personnalisés
│   ├── lib/              # Utilitaires et helpers
│   ├── db/               # Configuration Supabase
│   ├── types/            # Types TypeScript
│   └── main.tsx          # Point d'entrée
├── public/               # Fichiers statiques
├── supabase/             # Fonctions Supabase Edge
├── index.html            # Template HTML
├── vite.config.ts        # Configuration Vite
├── tailwind.config.js    # Configuration Tailwind CSS
└── package.json          # Dépendances
```

## ✨ Caractéristiques

- ✅ **Emploi du temps** - Gérez vos cours et emploi du temps
- ✅ **Gestion des cours** - Créez et gérez vos cours
- ✅ **Notes & Résultats** - Consultez vos notes
- ✅ **Calendrier intégré** - Planifiez vos événements
- ✅ **Notifications** - Recevez des alertes et rappels
- ✅ **Annuaire** - Trouvez les contacts d'autres utilisateurs
- ✅ **Partage de ressources** - Partagez des documents et supports
- ✅ **Groupes d'étude** - Formez des groupes de travail
- ✅ **Visioconférence** - Communiquez en temps réel
- ✅ **Assistant vocal** - Dictez vos notes
- ✅ **Mode hors ligne** - Continuez à travailler sans connexion
- ✅ **Installation PWA** - Installez comme une application native
- ✅ **Support mobile** - Responsive design pour tous les appareils
- ✅ **Thème clair/sombre** - Choisissez votre thème préféré

## 🛠️ Technologies Utilisées

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Shadcn/UI
- **État:** Context API, React Router
- **Backend:** Supabase (PostgreSQL + Auth)
- **PWA:** Service Workers, Web App Manifest
- **Notifications:** Push Notifications API
- **Offline:** IndexedDB, Service Workers
- **Linting:** Biome, ESLint

## 🔧 Configuration Avancée

### Variables d'environnement

Créez un `.env.local`:

```env
# Supabase
VITE_SUPABASE_URL=votre_url
VITE_SUPABASE_ANON_KEY=votre_clé

# Analytics (optionnel)
VITE_ANALYTICS_ID=votre_id

# Autres services
VITE_API_BASE_URL=http://localhost:3000
```

### Personnalisation des couleurs

Modifiez `tailwind.config.js` pour changer les couleurs primaires:

```javascript
theme: {
  extend: {
    colors: {
      primary: 'hsl(217 91% 60%)',  // Modifiez cette couleur
      // ...
    }
  }
}
```

## 📱 Installation PWA

L'application peut être installée sur votre appareil:

- **Windows/Mac/Linux:** Cliquez sur l'icône d'installation dans la barre de navigation
- **iOS:** Appuyez sur "Partager" → "Ajouter à l'écran d'accueil"
- **Android:** Appuyez sur le menu → "Installer l'application"

## 🔐 Authentification

L'application utilise Supabase pour l'authentification:

- Email/Mot de passe
- Google OAuth
- GitHub OAuth (configurable)

## 📊 Base de données

Les tables principales dans Supabase:

- `profiles` - Profils utilisateurs
- `courses` - Cours
- `schedules` - Emploi du temps
- `grades` - Notes
- `materials` - Ressources pédagogiques
- `notifications` - Notifications

## 🚀 Déploiement

### Vercel (recommandé)

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm i -g netlify-cli
netlify deploy
```

### Docker

```bash
docker build -t campus-en-ligne .
docker run -p 3000:3000 campus-en-ligne
```

## 🤝 Support & Contributions

- **Issues:** Signalez les bugs sur la page GitHub
- **Discussions:** Participez aux discussions communautaires
- **Pull Requests:** Les contributions sont bienvenues!

## 📄 Licence

Ce projet est sous licence MIT. Voir `LICENSE` pour plus de détails.

## 📞 Contact

Pour toute question ou suggestion:
- 📧 Email: contact@campus-en-ligne.fr
- 🌐 Site Web: https://campus-en-ligne.fr
- 💬 Discord: [Rejoindre le serveur](https://discord.gg/campus)

---

**Fait avec ❤️ pour les étudiants**
