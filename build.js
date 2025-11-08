import { execSync } from 'child_process'
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, cpSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
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

// Transformer les chemins absolus dans les fichiers JS pour qu'ils utilisent le base path
function fixAbsolutePathsInJS(targetPath, basePath) {
  try {
    // Parcourir récursivement tous les fichiers JS dans le dossier target
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
    const basePathWithoutSlash = basePath.replace(/\/$/, '') // Enlever le trailing slash
    
    // Fonction helper pour vérifier si on doit skip le remplacement
    function shouldSkipReplacement(content, match) {
      const matchIndex = content.indexOf(match)
      if (matchIndex > 0) {
        const lineStart = content.lastIndexOf('\n', matchIndex) + 1
        const lineBeforeMatch = content.substring(lineStart, matchIndex)
        // Ne pas modifier les URLs complètes
        if (lineBeforeMatch.includes('://') || lineBeforeMatch.trim().endsWith('//')) {
          return true
        }
      }
      return false
    }
    
    // Dossiers d'assets courants à chercher
    const assetFolders = ['textures', 'assets', 'static', 'images', 'media']
    
    for (const jsFile of jsFiles) {
      let content = readFileSync(jsFile, 'utf-8')
      const originalContent = content
      
      // Remplacer les chemins absolus qui pointent vers des assets statiques
      // Pattern: '/textures/...' ou '/assets/...' etc.
      // On évite de remplacer les chemins qui commencent déjà par le base path
      // et on évite les URLs complètes (http://, https://, //)
      
      // Remplacer les chemins absolus '/textures/', '/assets/', etc. par leur équivalent avec base path
      // On cherche les patterns dans les strings JavaScript (entre quotes)
      for (const folder of assetFolders) {
        // Pattern pour détecter '/textures/...' dans des strings
        // On utilise trois patterns séparés pour chaque type de quote pour éviter les problèmes d'échappement
        
        // Pattern pour single quotes: '/textures/...'
        const patternSingle = new RegExp("(['])\\/" + folder + "\\/([^'\\s\\n\\r]*)", 'g')
        content = content.replace(patternSingle, (match, quote, path) => {
          if (shouldSkipReplacement(content, match)) return match
          if (path.startsWith(basePathWithoutSlash)) return match
          totalReplacements++
          return quote + basePathWithoutSlash + '/' + folder + '/' + path
        })
        
        // Pattern pour double quotes: "/textures/..."
        const patternDouble = new RegExp('(["])/' + folder + '/([^"\\s\\n\\r]*)', 'g')
        content = content.replace(patternDouble, (match, quote, path) => {
          if (shouldSkipReplacement(content, match)) return match
          if (path.startsWith(basePathWithoutSlash)) return match
          totalReplacements++
          return quote + basePathWithoutSlash + '/' + folder + '/' + path
        })
        
        // Pattern pour backticks: `/textures/...`
        const patternBacktick = new RegExp('([`])/' + folder + '/([^`\\s\\n\\r]*)', 'g')
        content = content.replace(patternBacktick, (match, quote, path) => {
          if (shouldSkipReplacement(content, match)) return match
          if (path.startsWith(basePathWithoutSlash)) return match
          totalReplacements++
          return quote + basePathWithoutSlash + '/' + folder + '/' + path
        })
      }
      
      // Écrire le fichier modifié si des changements ont été faits
      if (content !== originalContent) {
        writeFileSync(jsFile, content, 'utf-8')
      }
    }
    
    if (totalReplacements > 0) {
      log(`  🔧 ${totalReplacements} chemin(s) absolu(s) corrigé(s) dans les fichiers JS`, 'green')
      return true
    }
    
    return false
  } catch (error) {
    log(`  ⚠️  Erreur lors de la correction des chemins: ${error.message}`, 'yellow')
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
  
  // Corriger les chemins absolus dans les fichiers JS
  fixAbsolutePathsInJS(targetPath, project.basePath)
  
  // Vérifier que les fichiers statiques sont bien présents
  const texturesPath = join(targetPath, 'textures')
  if (existsSync(texturesPath)) {
    const textureFiles = readdirSync(texturesPath, { recursive: true })
    const textureCount = textureFiles.filter(f => 
      typeof f === 'string' && /\.(jpg|jpeg|png|gif|webp|hdr)$/i.test(f)
    ).length
    if (textureCount > 0) {
      log(`  ✓ ${textureCount} texture(s) trouvée(s)`, 'green')
    }
  } else {
    log(`  ⚠️  Aucun dossier textures trouvé pour ${project.name}`, 'yellow')
  }
  
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
  const routes = []
  const rewrites = []
  
  // Pour chaque projet
  for (const project of projects) {
    const basePathWithSlash = project.basePath
    const basePathWithoutSlash = basePathWithSlash.replace(/\/$/, '')
    
    // IMPORTANT: Les routes sont évaluées AVANT les rewrites
    // On crée des routes explicites pour les fichiers statiques pour s'assurer qu'ils sont servis
    // Les extensions de fichiers statiques courantes
    const staticFilePattern = '\\.(js|css|jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot|map|json|hdr|mp4|webm|ogg|mp3|wav|flac|aac)$'
    
    // Route pour servir les fichiers statiques du projet (évaluée en premier)
    routes.push({
      src: `${basePathWithSlash}(.*${staticFilePattern})`,
      dest: `${basePathWithSlash}$1`,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
    
    // Route pour servir les textures spécifiquement (au cas où)
    routes.push({
      src: `${basePathWithSlash}textures/(.*)`,
      dest: `${basePathWithSlash}textures/$1`,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
    
    // Rewrite pour les routes sous le basePath, mais seulement pour les requêtes HTML
    // Cela permet de servir les fichiers statiques normalement via les routes ci-dessus
    rewrites.push({
      source: `${basePathWithSlash}:path*`,
      destination: `${basePathWithSlash}index.html`,
      has: [
        {
          type: 'header',
          key: 'accept',
          value: 'text/html',
        },
      ],
    })
    
    // Rewrite pour le basePath lui-même (sans trailing slash) - seulement pour HTML
    rewrites.push({
      source: basePathWithoutSlash,
      destination: `${basePathWithSlash}index.html`,
      has: [
        {
          type: 'header',
          key: 'accept',
          value: 'text/html',
        },
      ],
    })
  }
  
  // Route pour servir les fichiers statiques à la racine (index.html, etc.)
  routes.push({
    src: '/(.*\\.(js|css|jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot|map|json|hdr)$)',
    dest: '/$1',
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
  
  // Rewrite pour la page d'index principale - seulement pour HTML
  rewrites.push({
    source: '/',
    destination: '/index.html',
    has: [
      {
        type: 'header',
        key: 'accept',
        value: 'text/html',
      },
    ],
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
    routes: routes,
    rewrites: rewrites
  }
  
  writeFileSync(
    join(__dirname, 'vercel.json'),
    JSON.stringify(vercelConfig, null, 2)
  )
  
  log(`📝 vercel.json généré avec ${routes.length} route(s) et ${rewrites.length} rewrite(s)`, 'green')
}

// Créer une page d'index minimaliste avec l'arbre des projets
function generateIndexPage(projects) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Arborescence des Projets</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body {
        background: #181818;
        color: #e5e5e5;
        font-family: monospace;
        margin: 0;
        padding: 2rem;
      }
      h1 {
        font-size: 1.7rem;
        font-weight: 400;
        margin-bottom: 1.7rem;
        letter-spacing: -0.03em;
      }
      .tree {
        list-style: none;
        padding-left: 0;
      }
      .tree li {
        margin: 0.4rem 0 0.4rem 1.1em;
        position: relative;
      }
      .tree li:before {
        content: '├──';
        position: absolute;
        left: -1.1em;
        color: #888;
      }
      .tree li:last-child:before {
        content: '└──';
      }
      a {
        color: #a8ffe6;
        text-decoration: none;
        transition: color 0.15s;
      }
      a:hover {
        color: #82aaff;
        text-decoration: underline dotted;
      }
      @media (max-width:600px){
        body { padding: 0.7rem; }
        h1 { font-size: 1.15rem; }
      }
    </style>
</head>
<body>
    <h1>Arborescence des Projets (${projects.length})</h1>
    <ul class="tree">
${
  projects.map((project, i) => {
    const name = project.name;
    return `      <li><a href="${project.basePath}">${name}</a></li>`;
  }).join('\n')
}
    </ul>
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

