const fs = require('fs');
const path = require('path');

const rootDir = '.'; // racine du repo

// Lis les dossiers dans la racine
const projects = fs.readdirSync(rootDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .filter(dirent => fs.existsSync(path.join(rootDir, dirent.name, 'vite.config.js'))) // on considère un dossier projet s'il contient vite.config.js
  .map(dirent => dirent.name);

// Génère les règles de rewrite
const rewrites = projects.map(name => ({
  src: `/${name}/(.*)`,
  dest: `${name}/dist/$1`
}));

// Écris le fichier vercel.json
const vercelConfig = {
  rewrites,
};

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

console.log('vercel.json généré avec les projets :', projects);