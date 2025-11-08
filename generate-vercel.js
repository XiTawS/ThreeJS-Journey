const fs = require('fs');
const path = require('path');

const rootDir = '.';

// Lis les dossiers contenant vite.config.js
const projects = fs.readdirSync(rootDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .filter(dirent => fs.existsSync(path.join(rootDir, dirent.name, 'vite.config.js')))
  .map(dirent => dirent.name);

// Crée les routes pour servir chaque dist
const routes = projects.flatMap(name => [
  {
    "source": `^/${name}/(.*)`,
    "destination": `${name}/dist/$1`
  },
  {
    "source": `^/${name}$`,
    "destination": `${name}/dist/index.html`
  }
]);

// Écris le vercel.json
const vercelConfig = { routes };

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));

console.log('vercel.json généré avec les projets :', projects);