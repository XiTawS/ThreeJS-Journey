# Three.js Journey - Monorepo

Collection de projets d'apprentissage Three.js avec une page d'accueil pour naviguer entre les différents projets.

## 🚀 Déploiement sur Vercel

Ce monorepo est configuré pour être déployé sur Vercel avec une page d'accueil permettant de naviguer entre tous les projets.

### Configuration

1. **Page d'accueil** : Une page d'accueil Vite à la racine liste automatiquement tous les projets disponibles
2. **Détection automatique** : Les projets sont détectés automatiquement en scannant les dossiers contenant un `package.json` et un `vite.config.js` (ou un `src/index.html`)
3. **Projets** : Chaque projet est accessible via `/nom-du-projet` (ex: `/03-first-threejs-project`)
4. **Build** : Le script `build:all` construit automatiquement tous les projets détectés et les organise dans un seul dossier `dist`

### Instructions de déploiement

1. **Installer les dépendances de la racine** :
```bash
npm install
```

2. **Tester le build localement** :
```bash
npm run build:all
```

3. **Déployer sur Vercel** :
   - Connectez votre repository GitHub à Vercel
   - Vercel détectera automatiquement le fichier `vercel.json`
   - Le build command `npm install && npm run build:all` sera exécuté automatiquement
   - Le dossier `dist` sera servi comme output

### Structure du projet

```
.
├── index.html              # Page d'accueil
├── src/                    # Source de la page d'accueil
│   ├── main.js
│   └── style.css
├── scripts/
│   ├── build-all.js              # Script de build pour tous les projets
│   └── generate-projects-list.js # Script pour générer la liste des projets
├── public/                  # Fichiers publics (projects.json généré)
├── vercel.json            # Configuration Vercel
├── package.json           # Dépendances racine
├── vite.config.js         # Configuration Vite pour la page d'accueil
└── [projet-XX]/          # Chaque projet individuel
    ├── src/
    ├── static/
    ├── package.json
    └── vite.config.js
```

### Ajouter un nouveau projet

Pour ajouter un nouveau projet, créez simplement un nouveau dossier avec :
- Un fichier `package.json`
- Un fichier `vite.config.js` (ou `vite.config.ts`)
- Un dossier `src/` contenant `index.html`

Le projet sera automatiquement détecté et ajouté à la page d'accueil lors du prochain build ou démarrage du serveur de développement.

### Développement local

Pour développer un projet individuellement :

```bash
cd 03-first-threejs-project
npm install
npm run dev
```

Pour tester la page d'accueil :

```bash
npm install
npm run dev
```

### Notes

- **Détection automatique** : Les projets sont détectés automatiquement - vous n'avez plus besoin de les lister manuellement
- Chaque projet doit être construit individuellement avant d'être copié dans le dossier `dist` principal
- Les chemins absolus dans les projets sont automatiquement ajustés pour fonctionner depuis les sous-dossiers
- Les assets statiques (textures, etc.) sont copiés avec chaque projet
- Le fichier `projects.json` est généré automatiquement et ne doit pas être modifié manuellement

