# ThreeJS Journey - Multi-projets Vercel

Ce projet regroupe plusieurs petits projets Three.js, chacun accessible via une URL différente sur Vercel.

## 🚀 Fonctionnalités

- ✅ **Détection automatique** : Tous les projets Vite sont détectés automatiquement
- ✅ **Build automatique** : Un seul `npm run build` build tous les projets
- ✅ **Routes automatiques** : Chaque projet est accessible via son `base` path configuré dans `vite.config.js`
- ✅ **Installation automatique** : Les dépendances de chaque projet sont installées automatiquement
- ✅ **Configuration Vercel automatique** : Le `vercel.json` est généré automatiquement
- ✅ **Page d'index** : Une page d'accueil liste tous les projets disponibles

## 📋 Prérequis

- Node.js >= 18.0.0
- npm

## 🛠️ Installation

```bash
# À la racine du projet
npm install
```

## 🔨 Build

Pour builder tous les projets :

```bash
npm run build
```

Le script va :
1. Détecter tous les projets (dossiers contenant `vite.config.js` et `package.json`)
2. Installer les dépendances de chaque projet
3. Builder chaque projet
4. Copier les builds dans `dist/` organisés par base path
5. Générer `vercel.json` avec les routes automatiques
6. Créer une page d'index listant tous les projets

## 📁 Structure

```
.
├── 03-first-threejs-project/    # Projet 1
│   ├── vite.config.js           # base: '/lesson3/'
│   ├── package.json
│   └── dist/                    # Build local (ignoré par git)
├── 04-transform-objects/        # Projet 2
│   └── ...
├── dist/                        # Build global (généré)
│   ├── index.html              # Page d'index
│   ├── lesson3/                # Build du projet 1
│   ├── lesson4/                # Build du projet 2
│   └── ...
├── build.js                     # Script de build automatique
├── package.json                 # Configuration racine
├── vercel.json                  # Config Vercel (généré automatiquement)
└── README.md
```

## 🌐 Déploiement sur Vercel

1. Connectez votre repository GitHub à Vercel
2. Vercel détectera automatiquement le `vercel.json`
3. Le build se lancera automatiquement à chaque push
4. Chaque projet sera accessible via son base path (ex: `/lesson3/`, `/lesson4/`)

## ➕ Ajouter un nouveau projet

Pour ajouter un nouveau projet, il suffit de :

1. Créer un nouveau dossier avec votre projet Vite
2. Configurer le `base` path dans `vite.config.js` :
   ```js
   export default {
     base: '/mon-nouveau-projet/',
     // ... reste de la config
   }
   ```
3. Le projet sera automatiquement détecté au prochain build !

**Aucune modification manuelle de `package.json` ou `vercel.json` n'est nécessaire !**

## 📝 Notes

- Chaque projet reste **autonome** avec sa propre structure Vite
- Le `base` path dans `vite.config.js` détermine l'URL du projet sur Vercel
- Les fichiers statiques (images, etc.) sont automatiquement gérés par Vercel
- Les routes SPA sont automatiquement configurées pour chaque projet

## 🐛 Dépannage

### Un projet ne se build pas

Vérifiez que :
- Le dossier contient `vite.config.js` et `package.json`
- Le `base` path est correctement configuré dans `vite.config.js`
- Les dépendances sont installables (`npm install` fonctionne)

### Les routes ne fonctionnent pas sur Vercel

Vérifiez que :
- Le `base` path commence et se termine par `/` (ex: `/lesson3/`)
- Le `vercel.json` a été généré après le build
- Le build a bien copié les fichiers dans `dist/[base-path]/`

## 📄 Licence

Ce projet est un projet d'apprentissage Three.js.

