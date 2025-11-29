import { execSync } from 'child_process'
import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, cpSync } from 'fs'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  distDir: join(__dirname, 'dist'),
  publicDir: join(__dirname, 'public'),
  port: 3000,
}

// ============================================================================
// UTILITAIRES
// ============================================================================

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

// ============================================================================
// DÉTECTION DES PROJETS
// ============================================================================

/**
 * Détecte tous les projets Vite récursivement dans les sous-dossiers
 * @returns {Array} Liste des projets trouvés
 */
function findProjects() {
  const projects = []
  
  function searchDirectory(dir, chapterName = null) {
    const entries = readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = join(dir, entry.name)
        const viteConfigPath = join(fullPath, 'vite.config.js')
        const packageJsonPath = join(fullPath, 'package.json')
        
        // Si c'est un projet Vite (a vite.config.js et package.json)
        if (existsSync(viteConfigPath) && existsSync(packageJsonPath)) {
          try {
            const viteConfigContent = readFileSync(viteConfigPath, 'utf-8')
            const baseMatch = viteConfigContent.match(/base\s*:\s*['"`]([^'"`]+)['"`]/)
            const basePath = baseMatch ? baseMatch[1] : `/${entry.name}/`
            const normalizedBase = basePath.startsWith('/') ? basePath : `/${basePath}`
            const normalizedBaseWithTrailing = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`
            
            projects.push({
              name: entry.name,
              chapter: chapterName,
              path: fullPath,
              basePath: normalizedBaseWithTrailing,
              viteConfigPath,
              packageJsonPath
            })
          } catch (error) {
            log(`⚠️  Erreur lors de la lecture de ${entry.name}: ${error.message}`, 'yellow')
          }
        } else {
          // Recherche récursive dans les dossiers chapitres
          if (entry.name.startsWith('Chapter')) {
            searchDirectory(fullPath, entry.name)
          } else {
            searchDirectory(fullPath, chapterName)
          }
        }
      }
    }
  }
  
  searchDirectory(__dirname)
  
  return projects.sort((a, b) => {
    if (a.chapter && b.chapter) {
      if (a.chapter !== b.chapter) {
        return a.chapter.localeCompare(b.chapter)
      }
    } else if (a.chapter) {
      return -1
    } else if (b.chapter) {
      return 1
    }
    return a.name.localeCompare(b.name)
  })
}

// ============================================================================
// BUILD DES PROJETS
// ============================================================================

/**
 * Installe les dépendances d'un projet
 */
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

/**
 * Build un projet
 */
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

// ============================================================================
// CORRECTION DES CHEMINS
// ============================================================================

/**
 * Corrige les chemins absolus dans les fichiers JS pour utiliser le base path
 */
function fixAbsolutePathsInJS(targetPath, basePath) {
  try {
    const jsFiles = []
    
    function findJSFiles(dir) {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          findJSFiles(fullPath)
        } else if (entry.isFile() && extname(entry.name) === '.js') {
          jsFiles.push(fullPath)
        }
      }
    }
    
    findJSFiles(targetPath)
    
    let totalReplacements = 0
    const basePathWithoutSlash = basePath.replace(/\/$/, '')
    const assetFolders = ['textures', 'assets', 'static', 'images', 'media']
    
    function shouldSkipReplacement(content, match) {
      const matchIndex = content.indexOf(match)
      if (matchIndex > 0) {
        const lineStart = content.lastIndexOf('\n', matchIndex) + 1
        const lineBeforeMatch = content.substring(lineStart, matchIndex)
        if (lineBeforeMatch.includes('://') || lineBeforeMatch.trim().endsWith('//')) {
          return true
        }
      }
      return false
    }
    
    for (const jsFile of jsFiles) {
      let content = readFileSync(jsFile, 'utf-8')
      const originalContent = content
      
      for (const folder of assetFolders) {
        const patterns = [
          { regex: new RegExp("(['])\\/" + folder + "\\/([^'\\s\\n\\r]*)", 'g'), quote: "'" },
          { regex: new RegExp('(["])/' + folder + '/([^"\\s\\n\\r]*)', 'g'), quote: '"' },
          { regex: new RegExp('([`])/' + folder + '/([^`\\s\\n\\r]*)', 'g'), quote: '`' }
        ]
        
        for (const { regex, quote } of patterns) {
          content = content.replace(regex, (match, quoteChar, path) => {
            if (shouldSkipReplacement(content, match)) return match
            if (path.startsWith(basePathWithoutSlash)) return match
            totalReplacements++
            return quoteChar + basePathWithoutSlash + '/' + folder + '/' + path
          })
        }
      }
      
      if (content !== originalContent) {
        writeFileSync(jsFile, content, 'utf-8')
      }
    }
    
    if (totalReplacements > 0) {
      log(`  🔧 ${totalReplacements} chemin(s) absolu(s) corrigé(s) dans les fichiers JS`, 'green')
    }
    
    return totalReplacements > 0
  } catch (error) {
    log(`  ⚠️  Erreur lors de la correction des chemins: ${error.message}`, 'yellow')
    return false
  }
}

// ============================================================================
// COPIE ET ORGANISATION
// ============================================================================

/**
 * Copie le build d'un projet dans le dossier dist global
 */
function copyBuildToGlobalDist(project) {
  const projectDistPath = join(project.path, 'dist')
  const globalDistPath = CONFIG.distDir
  
  if (!existsSync(projectDistPath)) {
    log(`⚠️  Aucun dossier dist trouvé pour ${project.name}`, 'yellow')
    return false
  }
  
  if (!existsSync(globalDistPath)) {
    mkdirSync(globalDistPath, { recursive: true })
  }
  
  const basePathParts = project.basePath.split('/').filter(p => p)
  const targetPath = join(globalDistPath, ...basePathParts)
  
  if (existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true })
  }
  
  cpSync(projectDistPath, targetPath, { recursive: true })
  log(`📁 Build copié dans ${targetPath.replace(__dirname, '.')}`, 'green')
  
  fixAbsolutePathsInJS(targetPath, project.basePath)
  
  return true
}

/**
 * Crée un dossier public pour Vercel (copie de dist)
 */
function createPublicDirectory() {
  if (!existsSync(CONFIG.distDir)) {
    log(`⚠️  Le dossier dist n'existe pas, impossible de créer public`, 'yellow')
    return false
  }
  
  if (existsSync(CONFIG.publicDir)) {
    rmSync(CONFIG.publicDir, { recursive: true, force: true })
  }
  
  cpSync(CONFIG.distDir, CONFIG.publicDir, { recursive: true })
  log(`📁 Dossier public créé (copie de dist)`, 'green')
  return true
}

// ============================================================================
// GÉNÉRATION DE LA PAGE D'INDEX
// ============================================================================

/**
 * Génère la page d'index HTML avec l'arborescence des projets
 */
function generateIndexPage(projects) {
  const projectsByChapter = {}
  projects.forEach(project => {
    const chapter = project.chapter || 'Autres'
    if (!projectsByChapter[chapter]) {
      projectsByChapter[chapter] = []
    }
    projectsByChapter[chapter].push(project)
  })
  
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Arborescence des Projets</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        background: #181818;
        color: #e5e5e5;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace;
        margin: 0;
        padding: 2rem;
        line-height: 1.8;
      }
      h1 {
        font-size: 1.7rem;
        font-weight: 400;
        margin-bottom: 2rem;
        letter-spacing: -0.03em;
        color: #e5e5e5;
      }
      .chapters-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 3rem;
      }
      .chapter {
        display: flex;
        flex-direction: column;
      }
      .chapter-title {
        font-size: 1.5rem;
        font-weight: 400;
        margin-bottom: 1rem;
        color: #a8ffe6;
        padding-left: 0;
      }
      .projects-list {
        list-style: none;
        padding-left: 0;
        margin: 0;
      }
      .projects-list li {
        margin: 0.5rem 0 0.5rem 1.1em;
        position: relative;
      }
      .projects-list li:before {
        content: '├──';
        position: absolute;
        left: -1.1em;
        color: #666;
      }
      .projects-list li:last-child:before {
        content: '└──';
      }
      a {
        color: #a8ffe6;
        text-decoration: none;
        transition: color 0.15s;
        margin: 1rem
      }
      a:hover {
        color: #82aaff;
        text-decoration: underline dotted;
      }
      @media (max-width: 768px) {
        body {
          padding: 1rem;
        }
        h1 {
          font-size: 1.3rem;
          margin-bottom: 1.5rem;
        }
        .chapters-container {
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        .chapter-title {
          font-size: 1.3rem;
        }
      }
    </style>
</head>
<body>
    <h1>Three.js Journey - Projets (${projects.length})</h1>
    <div class="chapters-container">
${
  Object.entries(projectsByChapter).map(([chapter, chapterProjects]) => `
      <div class="chapter">
        <h2 class="chapter-title">${chapter}</h2>
        <ul class="projects-list">
${
  chapterProjects.map(project => `
          <li><a href="${project.basePath}">${project.name}</a></li>
`).join('')
}
        </ul>
      </div>
`).join('')
}
    </div>
</body>
</html>`
  
  if (!existsSync(CONFIG.distDir)) {
    mkdirSync(CONFIG.distDir, { recursive: true })
  }
  
  writeFileSync(join(CONFIG.distDir, 'index.html'), html)
  log(`📄 Page d'index générée`, 'green')
}

// ============================================================================
// CONFIGURATION VERCEL
// ============================================================================

/**
 * Génère le fichier vercel.json pour le déploiement
 */
function generateVercelConfig(projects) {
  const routes = []
  const rewrites = []
  const staticFilePattern = '\\.(js|css|jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot|map|json|hdr|mp4|webm|ogg|mp3|wav|flac|aac)$'
  
  for (const project of projects) {
    const basePathWithSlash = project.basePath
    const basePathWithoutSlash = basePathWithSlash.replace(/\/$/, '')
    
    routes.push({
      src: `${basePathWithSlash}(.*${staticFilePattern})`,
      dest: `${basePathWithSlash}$1`,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
    
    routes.push({
      src: `${basePathWithSlash}textures/(.*)`,
      dest: `${basePathWithSlash}textures/$1`,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
    
    rewrites.push({
      source: `${basePathWithSlash}:path*`,
      destination: `${basePathWithSlash}index.html`,
      has: [{
        type: 'header',
        key: 'accept',
        value: 'text/html',
      }],
    })
    
    rewrites.push({
      source: basePathWithoutSlash,
      destination: `${basePathWithSlash}index.html`,
      has: [{
        type: 'header',
        key: 'accept',
        value: 'text/html',
      }],
    })
  }
  
  routes.push({
    src: `/(.*${staticFilePattern})`,
    dest: '/$1',
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
  
  rewrites.push({
    source: '/',
    destination: '/index.html',
    has: [{
      type: 'header',
      key: 'accept',
      value: 'text/html',
    }],
  })
  
  const vercelConfig = {
    version: 2,
    outputDirectory: 'dist',
    builds: [{
      src: 'package.json',
      use: '@vercel/static-build',
      config: {
        outputDirectory: 'dist'
      }
    }],
    routes,
    rewrites
  }
  
  writeFileSync(
    join(__dirname, 'vercel.json'),
    JSON.stringify(vercelConfig, null, 2)
  )
  
  log(`📝 vercel.json généré avec ${routes.length} route(s) et ${rewrites.length} rewrite(s)`, 'green')
}

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Build complet de tous les projets
 */
async function buildAll() {
  log('\n🚀 Démarrage du build automatique...\n', 'bright')
  
  // Nettoyer le dossier dist
  if (existsSync(CONFIG.distDir)) {
    log('🧹 Nettoyage du dossier dist...', 'blue')
    rmSync(CONFIG.distDir, { recursive: true, force: true })
  }
  mkdirSync(CONFIG.distDir, { recursive: true })
  
  // Détecter les projets
  log('🔍 Détection des projets...', 'blue')
  const projects = findProjects()
  log(`✅ ${projects.length} projet(s) trouvé(s)\n`, 'green')
  
  if (projects.length === 0) {
    log('❌ Aucun projet trouvé!', 'red')
    process.exit(1)
  }
  
  // Afficher la liste
  projects.forEach(project => {
    log(`  - ${project.name} (${project.basePath})`, 'blue')
  })
  console.log()
  
  // Build chaque projet
  const buildResults = []
  for (const project of projects) {
    log(`\n📦 Traitement de ${project.name}...`, 'bright')
    
    if (!installDependencies(project)) {
      log(`⚠️  Passage au projet suivant...`, 'yellow')
      continue
    }
    
    if (!buildProject(project)) {
      log(`⚠️  Passage au projet suivant...`, 'yellow')
      continue
    }
    
    if (copyBuildToGlobalDist(project)) {
      buildResults.push(project)
    }
  }
  
  // Générer les fichiers finaux
  generateIndexPage(buildResults)
  generateVercelConfig(buildResults)
  createPublicDirectory()
  
  log(`\n✅ Build terminé! ${buildResults.length}/${projects.length} projet(s) buildé(s) avec succès\n`, 'green')
  
  if (buildResults.length < projects.length) {
    log(`⚠️  ${projects.length - buildResults.length} projet(s) n'ont pas pu être buildé(s)`, 'yellow')
  }
}

/**
 * Génère uniquement la page HTML (sans builder les projets)
 */
async function generateHTMLOnly() {
  log('\n📄 Génération de la page HTML uniquement...\n', 'bright')
  
  if (!existsSync(CONFIG.distDir)) {
    mkdirSync(CONFIG.distDir, { recursive: true })
  }
  
  log('🔍 Détection des projets...', 'blue')
  const projects = findProjects()
  log(`✅ ${projects.length} projet(s) trouvé(s)\n`, 'green')
  
  if (projects.length === 0) {
    log('❌ Aucun projet trouvé!', 'red')
    process.exit(1)
  }
  
  generateIndexPage(projects)
  
  log(`\n✅ Page HTML générée dans dist/index.html\n`, 'green')
  log(`💡 Pour tester: npm run serve\n`, 'blue')
}

// ============================================================================
// POINT D'ENTRÉE
// ============================================================================

const isHTMLOnly = process.argv.includes('--html-only')

if (isHTMLOnly) {
  generateHTMLOnly().catch(error => {
    log(`\n❌ Erreur: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  })
} else {
  buildAll().catch(error => {
    log(`\n❌ Erreur fatale: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  })
}
