# Three.js Journey - Collection de Projets

Ce projet regroupe plusieurs projets d'apprentissage Three.js organisés par chapitres, chacun accessible via une URL différente sur Vercel.

## 🚀 Fonctionnalités

- ✅ **Détection automatique** : Tous les projets Vite sont détectés automatiquement (y compris dans les sous-dossiers)
- ⚡️ **Build Parallèle** : Les projets sont compilés en parallèle (4x plus rapide)
- 📦 **Smart Caching** : L'installation des dépendances est intelligente (sautée si déjà présente) -> gain de temps énorme !
- 🧹 **Nettoyage Rapide** : Script utilitaire pour nettoyer tout le workspace en quelques secondes
- ✅ **Organisation par chapitres** : Les projets sont organisés dans des dossiers chapitres (Chapter 01, 02, 03...)
- ✅ **Routes automatiques** : Chaque projet est accessible via son `base` path configuré dans `vite.config.js`
- ✅ **Configuration Vercel automatique** : Le `vercel.json` est généré automatiquement
- ✅ **Page d'index moderne** : Une page d'accueil minimaliste liste tous les projets par chapitre

## 📋 Prérequis

- Node.js >= 18.0.0
- npm

## 🛠️ Installation

```bash
# À la racine du projet
npm install
```

## 📜 Scripts Disponibles

### Build complet (Optimisé)
```bash
npm run build
```
Build tous les projets en parallèle.
- Utilise le cache pour les dépendances (`node_modules`).
- Génère la page d'index et la configuration Vercel.
- Option `--force` disponible pour forcer la réinstallation : `node build.js --force`.

### Nettoyage complet
```bash
npm run clean
```
Supprime :
- Le dossier `dist/`
- Le fichier `vercel.json`
- **Tous** les dossiers `node_modules` des sous-projets
Utilisez cette commande pour faire table rase si vous avez des soucis de dépendances.

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

1. **Détection** : Recherche récursive de tous les projets Vite.
2. **Nettoyage** : Supprime l'ancien dossier `dist`.
3. **Optimisation** : Traite les projets par lots (4 simultanés) pour maximiser la vitesse.
4. **Cache** : Installe les dépendances uniquement si nécessaire.
5. **Build** : Build chaque projet avec Vite.
6. **Copie & Correction** : Centralise les builds et corrige les chemins d'assets.
7. **Génération** : Crée l'index et la config Vercel.

## 📁 Structure du Projet

```
.
├── Chapter 01 - Basics/              # Chapitre 1
│   ├── 03-first-threejs-project/
│   │   ├── vite.config.js           # base: '/lesson3/'
│   │   ├── package.json
│   │   ├── src/
│   │   └── ...
├── dist/                             # Build global (généré)
├── public/                           # Copie de dist pour Vercel (généré)
├── build.js                          # Script de build optimisé
├── clean.js                          # Script de nettoyage rapide
├── package.json                      # Configuration racine
├── vercel.json                       # Config Vercel (généré automatiquement)
└── README.md
```

## 🐛 Dépannage

### Problème de dépendances / Build échoué
Si un projet refuse de se builder (erreur `esbuild` ou module manquant), la solution la plus simple est de tout nettoyer et recommencer :

```bash
npm run clean
npm run build
```

### Le script de build est bloqué ?
Le script utilise une concurrence limitée à 4 threads pour éviter de surcharger votre ordinateur. Si cela bloque, essayez de réduire ce chiffre dans `build.js` (`concurrency`).

## 📄 Licence

Ce projet est un projet d'apprentissage Three.js basé sur le cours [Three.js Journey](https://threejs-journey.com/).
