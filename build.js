import { execSync } from 'child_process'
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, cpSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Détecter tous les projets Vite
function findProjects() {
  const projects = []
  const entries = readdirSync(__dirname, { withFileTypes: true })
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const viteConfigPath = join(__dirname, entry.name, 'vite.config.js')
      const packageJsonPath = join(__dirname, entry.name, 'package.json')
      
      if (existsSync(viteConfigPath) && existsSync(packageJsonPath)) {
        try {
          const viteConfigContent = readFileSync(viteConfigPath, 'utf-8')
          // Extraire le base path de la config
          const baseMatch = viteConfigContent.match(/base\s*:\s*['"`]([^'"`]+)['"`]/)
          const basePath = baseMatch ? baseMatch[1] : `/${entry.name}/`
          // Normaliser le base path (ajouter les slashes si nécessaire)
          const normalizedBase = basePath.startsWith('/') ? basePath : `/${basePath}`
          const normalizedBaseWithTrailing = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`
          
          projects.push({
            name: entry.name,
            path: join(__dirname, entry.name),
            basePath: normalizedBaseWithTrailing,
            viteConfigPath,
            packageJsonPath
          })
        } catch (error) {
          log(`⚠️  Erreur lors de la lecture de ${entry.name}: ${error.message}`, 'yellow')
        }
      }
    }
  }
  
  return projects.sort((a, b) => a.name.localeCompare(b.name))
}

// Installer les dépendances d'un projet
function installDependencies(project) {
  log(`📦 Installation des dépendances pour ${project.name}...`, 'blue')
  try {
    execSync('npm install', {
      cwd: project.path,
      stdio: 'inherit'
    })
    log(`✅ Dépendances installées pour ${project.name}`, 'green')
    return true
  } catch (error) {
    log(`❌ Erreur lors de l'installation des dépendances pour ${project.name}`, 'red')
    return false
  }
}

// Build un projet
function buildProject(project) {
  log(`🔨 Build de ${project.name}...`, 'blue')
  try {
    execSync('npm run build', {
      cwd: project.path,
      stdio: 'inherit'
    })
    log(`✅ Build réussi pour ${project.name}`, 'green')
    return true
  } catch (error) {
    log(`❌ Erreur lors du build de ${project.name}`, 'red')
    return false
  }
}

// Copier le build dans le dossier dist global
function copyBuildToGlobalDist(project) {
  const projectDistPath = join(project.path, 'dist')
  const globalDistPath = join(__dirname, 'dist')
  
  if (!existsSync(projectDistPath)) {
    log(`⚠️  Aucun dossier dist trouvé pour ${project.name}`, 'yellow')
    return false
  }
  
  // Créer le dossier dist global s'il n'existe pas
  if (!existsSync(globalDistPath)) {
    mkdirSync(globalDistPath, { recursive: true })
  }
  
  // Le basePath détermine où copier les fichiers
  // Par exemple, si basePath est /lesson3/, on copie dans dist/lesson3/
  const basePathParts = project.basePath.split('/').filter(p => p)
  const targetPath = join(globalDistPath, ...basePathParts)
  
  // Supprimer le dossier de destination s'il existe
  if (existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true })
  }
  
  // Copier le contenu du dist du projet
  cpSync(projectDistPath, targetPath, { recursive: true })
  log(`📁 Build copié dans ${targetPath.replace(__dirname, '.')}`, 'green')
  
  return true
}

// Créer un dossier public pour Vercel (certaines configurations Vercel cherchent public par défaut)
function createPublicDirectory() {
  const distPath = join(__dirname, 'dist')
  const publicPath = join(__dirname, 'public')
  
  if (!existsSync(distPath)) {
    log(`⚠️  Le dossier dist n'existe pas, impossible de créer public`, 'yellow')
    return false
  }
  
  // Supprimer public s'il existe
  if (existsSync(publicPath)) {
    rmSync(publicPath, { recursive: true, force: true })
  }
  
  // Copier le contenu de dist dans public
  cpSync(distPath, publicPath, { recursive: true })
  log(`📁 Dossier public créé (copie de dist)`, 'green')
  
  return true
}

// Générer vercel.json automatiquement
function generateVercelConfig(projects) {
  const rewrites = []
  
  // Pour chaque projet, créer un rewrite pour le SPA
  // Vercel sert automatiquement les fichiers statiques s'ils existent
  // Les rewrites ne s'appliquent que si le fichier n'existe pas
  for (const project of projects) {
    const basePathWithSlash = project.basePath
    const basePathWithoutSlash = basePathWithSlash.replace(/\/$/, '')
    
    // Rewrite pour toutes les routes sous le basePath vers index.html
    // Vercel servira automatiquement les fichiers statiques (.js, .css, .png, etc.) s'ils existent
    rewrites.push({
      source: `${basePathWithSlash}:path*`,
      destination: `${basePathWithSlash}index.html`
    })
    
    // Rewrite pour le basePath lui-même (sans trailing slash)
    rewrites.push({
      source: basePathWithoutSlash,
      destination: `${basePathWithSlash}index.html`
    })
  }
  
  // Rewrite pour la page d'index principale
  rewrites.push({
    source: '/',
    destination: '/index.html'
  })
  
  const vercelConfig = {
    version: 2,
    outputDirectory: 'dist',
    builds: [
      {
        src: 'package.json',
        use: '@vercel/static-build',
        config: {
          outputDirectory: 'dist'
        }
      }
    ],
    rewrites: rewrites
  }
  
  writeFileSync(
    join(__dirname, 'vercel.json'),
    JSON.stringify(vercelConfig, null, 2)
  )
  
  log(`📝 vercel.json généré avec ${rewrites.length} rewrite(s)`, 'green')
}

// Créer une page d'index qui liste tous les projets
function generateIndexPage(projects) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ThreeJS Journey - Projets</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 3rem;
            font-size: 3rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        .project-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        .project-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 12px rgba(0,0,0,0.2);
        }
        .project-card h2 {
            color: #667eea;
            margin-bottom: 0.5rem;
            font-size: 1.5rem;
        }
        .project-card p {
            color: #666;
            margin-top: 0.5rem;
        }
        .project-link {
            display: inline-block;
            margin-top: 1rem;
            color: #667eea;
            font-weight: bold;
            text-decoration: none;
        }
        .project-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 ThreeJS Journey</h1>
        <div class="projects-grid">
${projects.map(project => {
  const displayName = project.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  return `            <a href="${project.basePath}" class="project-card">
                <h2>${displayName}</h2>
                <p>Projet Three.js</p>
                <span class="project-link">Voir le projet →</span>
            </a>`
}).join('\n')}
        </div>
    </div>
</body>
</html>`
  
  const distPath = join(__dirname, 'dist')
  if (!existsSync(distPath)) {
    mkdirSync(distPath, { recursive: true })
  }
  
  writeFileSync(join(distPath, 'index.html'), html)
  log(`📄 Page d'index générée`, 'green')
}

// Fonction principale
async function main() {
  log('\n🚀 Démarrage du build automatique...\n', 'bright')
  
  // Nettoyer le dossier dist global
  const globalDistPath = join(__dirname, 'dist')
  if (existsSync(globalDistPath)) {
    log('🧹 Nettoyage du dossier dist...', 'blue')
    rmSync(globalDistPath, { recursive: true, force: true })
  }
  mkdirSync(globalDistPath, { recursive: true })
  
  // Détecter tous les projets
  log('🔍 Détection des projets...', 'blue')
  const projects = findProjects()
  log(`✅ ${projects.length} projet(s) trouvé(s)\n`, 'green')
  
  if (projects.length === 0) {
    log('❌ Aucun projet trouvé!', 'red')
    process.exit(1)
  }
  
  // Afficher la liste des projets
  projects.forEach(project => {
    log(`  - ${project.name} (${project.basePath})`, 'blue')
  })
  console.log()
  
  // Build chaque projet
  const buildResults = []
  for (const project of projects) {
    log(`\n📦 Traitement de ${project.name}...`, 'bright')
    
    // Installer les dépendances
    const installSuccess = installDependencies(project)
    if (!installSuccess) {
      log(`⚠️  Passage au projet suivant...`, 'yellow')
      continue
    }
    
    // Build le projet
    const buildSuccess = buildProject(project)
    if (!buildSuccess) {
      log(`⚠️  Passage au projet suivant...`, 'yellow')
      continue
    }
    
    // Copier le build dans le dist global
    const copySuccess = copyBuildToGlobalDist(project)
    if (copySuccess) {
      buildResults.push(project)
    }
  }
  
  // Générer la page d'index
  generateIndexPage(buildResults)
  
  // Générer vercel.json
  generateVercelConfig(buildResults)
  
  // Créer un dossier public pour Vercel (au cas où)
  createPublicDirectory()
  
  log(`\n✅ Build terminé! ${buildResults.length}/${projects.length} projet(s) buildé(s) avec succès\n`, 'green')
  
  if (buildResults.length < projects.length) {
    log(`⚠️  ${projects.length - buildResults.length} projet(s) n'ont pas pu être buildé(s)`, 'yellow')
  }
}

main().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})

