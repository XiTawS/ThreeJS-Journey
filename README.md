# Three.js Journey - Collection de Projets

Ce projet regroupe plusieurs projets d'apprentissage Three.js organisés par chapitres, chacun accessible via une URL différente sur Vercel.

## 🚀 Fonctionnalités

- ✅ **Détection automatique** : Tous les projets Vite sont détectés automatiquement (y compris dans les sous-dossiers)
- ✅ **Organisation par chapitres** : Les projets sont organisés dans des dossiers chapitres (Chapter 01, 02, 03...)
- ✅ **Build automatique** : Un seul `npm run build` build tous les projets
- ✅ **Routes automatiques** : Chaque projet est accessible via son `base` path configuré dans `vite.config.js`
- ✅ **Installation automatique** : Les dépendances de chaque projet sont installées automatiquement
- ✅ **Configuration Vercel automatique** : Le `vercel.json` est généré automatiquement
- ✅ **Page d'index moderne** : Une page d'accueil minimaliste liste tous les projets par chapitre
- ✅ **Test en local** : Scripts pour tester rapidement le HTML sans builder tous les projets

## 📋 Prérequis

- Node.js >= 18.0.0
- npm

## 🛠️ Installation

```bash
# À la racine du projet
npm install
```

## 📜 Scripts Disponibles

### Build complet
```bash
npm run build
```
Build tous les projets, génère la page d'index et la configuration Vercel.

### Générer uniquement le HTML
```bash
npm run html
```
Génère uniquement la page d'index HTML sans builder les projets (utile pour tester le design).

### Servir en local
```bash
npm run serve
```
Lance un serveur local sur `http://localhost:3000` pour tester le dossier `dist/`.

### Preview rapide
```bash
npm run preview
```
Génère le HTML puis lance le serveur (idéal pour tester rapidement la page d'index).

## 🔨 Processus de Build

Le script `build.js` effectue automatiquement :

1. **Détection** : Recherche récursive de tous les projets Vite (dossiers contenant `vite.config.js` et `package.json`)
2. **Organisation** : Regroupe les projets par chapitre (dossiers commençant par "Chapter")
3. **Installation** : Installe les dépendances de chaque projet
4. **Build** : Build chaque projet avec Vite
5. **Copie** : Copie les builds dans `dist/` organisés par base path
6. **Correction** : Corrige automatiquement les chemins absolus dans les fichiers JS
7. **Génération** : 
   - Génère `dist/index.html` avec l'arborescence des projets
   - Génère `vercel.json` avec les routes automatiques
   - Crée `public/` (copie de `dist/` pour Vercel)

## 📁 Structure du Projet

```
.
├── Chapter 01 - Basics/              # Chapitre 1
│   ├── 03-first-threejs-project/
│   │   ├── vite.config.js           # base: '/lesson3/'
│   │   ├── package.json
│   │   ├── src/
│   │   └── static/
│   ├── 04-transform-objects/
│   └── ...
├── Chapter 02 - Classic techniques/  # Chapitre 2
│   ├── 14-lights/
│   ├── 15-shadows/
│   └── ...
├── Chapter 03 - Advanced techniques/ # Chapitre 3
│   ├── 20-physics/
│   ├── 21-imported-models/
│   └── ...
├── dist/                             # Build global (généré)
│   ├── index.html                    # Page d'index avec arborescence
│   ├── lesson3/                     # Build du projet 1
│   ├── lesson4/                     # Build du projet 2
│   └── ...
├── public/                           # Copie de dist pour Vercel (généré)
├── build.js                          # Script de build automatique
├── package.json                      # Configuration racine
├── vercel.json                       # Config Vercel (généré automatiquement)
└── README.md
```

## 🎨 Page d'Index

La page d'index (`dist/index.html`) affiche :
- Les chapitres côte à côte
- Les titres de chapitres en grand
- Les projets listés en arborescence sous chaque chapitre
- Style minimaliste moderne avec police monospace

## 🧪 Test en Local

### Tester uniquement le HTML
```bash
npm run preview
```
Génère la page d'index et lance un serveur local. Les liens vers les projets ne fonctionneront pas tant que les projets ne sont pas buildés, mais vous pouvez voir le design.

### Tester après build complet
```bash
npm run build
npm run serve
```
Tous les projets seront accessibles via leurs URLs respectives.

## 🌐 Déploiement sur Vercel

1. Connectez votre repository GitHub à Vercel
2. Vercel détectera automatiquement le `vercel.json`
3. Le build se lancera automatiquement à chaque push
4. Chaque projet sera accessible via son base path (ex: `/lesson3/`, `/lesson4/`)
5. La page d'index sera accessible à la racine `/`

## ➕ Ajouter un Nouveau Projet

Pour ajouter un nouveau projet :

1. **Créer le projet** dans le chapitre approprié :
   ```
   Chapter 01 - Basics/
   └── mon-nouveau-projet/
       ├── vite.config.js
       ├── package.json
       └── src/
   ```

2. **Configurer le base path** dans `vite.config.js` :
   ```js
   export default {
     base: '/mon-nouveau-projet/',
     root: 'src/',
     publicDir: '../static/',
     // ... reste de la config
   }
   ```

3. **Le projet sera automatiquement détecté** au prochain build !

**Aucune modification manuelle de `package.json` ou `vercel.json` n'est nécessaire !**

## 📝 Notes Importantes

- Chaque projet reste **autonome** avec sa propre structure Vite
- Le `base` path dans `vite.config.js` détermine l'URL du projet sur Vercel
- Les fichiers statiques (textures, images, etc.) sont automatiquement gérés
- Les routes SPA sont automatiquement configurées pour chaque projet
- Les chemins absolus dans les fichiers JS sont automatiquement corrigés pour utiliser le base path

## 🐛 Dépannage

### Un projet ne se build pas

Vérifiez que :
- Le dossier contient `vite.config.js` et `package.json`
- Le `base` path est correctement configuré dans `vite.config.js` (commence et se termine par `/`)
- Les dépendances sont installables (`npm install` fonctionne dans le dossier du projet)

### Les routes ne fonctionnent pas sur Vercel

Vérifiez que :
- Le `base` path commence et se termine par `/` (ex: `/lesson3/`)
- Le `vercel.json` a été généré après le build
- Le build a bien copié les fichiers dans `dist/[base-path]/`

### La page d'index ne s'affiche pas correctement

- Vérifiez que `npm run html` ou `npm run build` a bien généré `dist/index.html`
- Vérifiez que le serveur local sert bien le dossier `dist/`
- Ouvrez la console du navigateur pour voir les erreurs éventuelles

## 📄 Licence

Ce projet est un projet d'apprentissage Three.js basé sur le cours [Three.js Journey](https://threejs-journey.com/).
