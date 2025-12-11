import { exec } from 'child_process'
import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, cpSync } from 'fs'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import { cpus } from 'os'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  distDir: join(__dirname, 'dist'),
  publicDir: join(__dirname, 'public'),
  concurrency: Math.max(1, Math.min(cpus().length, 4)), // Max 4 pour éviter surcharge I/O
}

const args = process.argv.slice(2)
const FORCE_INSTALL = args.includes('--force') || args.includes('-f')
const HTML_ONLY = args.includes('--html-only')

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
  gray: '\x1b[90m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

/**
 * Exécute une commande de manière asynchrone sans polluer la sortie standard
 */
async function runCommand(command, cwd) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd })
    return { success: true, stdout, stderr }
  } catch (error) {
    return { success: false, stdout: error.stdout, stderr: error.stderr, error }
  }
}

/**
 * Helper pour exécuter des tâches en parallèle avec une limite de concurrence
 */
async function runConcurrent(items, fn, limit) {
  const customLimit = Math.min(items.length, limit)
  const queue = [...items]
  const results = []

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()
      const result = await fn(item)
      results.push(result)
    }
  }

  const workers = Array(customLimit).fill(null).map(() => worker())
  await Promise.all(workers)
  return results
}

// ============================================================================
// DÉTECTION DES PROJETS
// ============================================================================

function findProjects() {
  const projects = []

  function searchDirectory(dir, chapterName = null) {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = join(dir, entry.name)
        const viteConfigPath = join(fullPath, 'vite.config.js')
        const packageJsonPath = join(fullPath, 'package.json')

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
            log(`⚠️  Erreur lecture ${entry.name}: ${error.message}`, 'yellow')
          }
        } else {
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
    if (a.chapter && b.chapter && a.chapter !== b.chapter) {
      return a.chapter.localeCompare(b.chapter)
    }
    return a.name.localeCompare(b.name)
  })
}

// ============================================================================
// LOGIQUE DE BUILD
// ============================================================================

async function processProject(project) {
  const start = Date.now()
  let skippedInstall = false

  // 1. Installation des dépendances
  const nodeModulesPath = join(project.path, 'node_modules')
  if (!FORCE_INSTALL && existsSync(nodeModulesPath)) {
    skippedInstall = true
  } else {
    // Si force install, on supprime node_modules pour être sûr
    if (FORCE_INSTALL && existsSync(nodeModulesPath)) {
      rmSync(nodeModulesPath, { recursive: true, force: true })
    }

    const installResult = await runCommand('npm install', project.path)
    if (!installResult.success) {
      log(`❌ ${project.name} - Échec install`, 'red')
      console.error(installResult.stderr)
      return { project, success: false, step: 'install' }
    }
  }

  // 2. Build
  const buildResult = await runCommand('npm run build', project.path)
  if (!buildResult.success) {
    log(`❌ ${project.name} - Échec build`, 'red')
    console.error(buildResult.stderr)
    return { project, success: false, step: 'build' }
  }

  // 3. Copy & Fix Paths
  try {
    copyBuildToGlobalDist(project)
  } catch (error) {
    log(`❌ ${project.name} - Échec copy: ${error.message}`, 'red')
    return { project, success: false, step: 'copy' }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1)
  const installMsg = skippedInstall ? '⚡️' : '📦'
  log(`✅ ${project.name} (${installMsg} ${duration}s)`, 'green')

  return { project, success: true }
}

function fixAbsolutePathsInJS(targetPath, basePath) {
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

  const basePathWithoutSlash = basePath.replace(/\/$/, '')
  const assetFolders = ['textures', 'assets', 'static', 'images', 'media']

  for (const jsFile of jsFiles) {
    let content = readFileSync(jsFile, 'utf-8')
    const originalContent = content

    for (const folder of assetFolders) {
      // Regex optimisée pour éviter les faux positifs (http://, etc.)
      const patterns = [
        { regex: new RegExp("(['])\\/" + folder + "\\/([^'\\s\\n\\r]*)", 'g') },
        { regex: new RegExp('(["])/' + folder + '/([^"\\s\\n\\r]*)', 'g') },
        { regex: new RegExp('([`])/' + folder + '/([^`\\s\\n\\r]*)', 'g') }
      ]

      for (const { regex } of patterns) {
        content = content.replace(regex, (match, quote, path) => {
          // Check simple pour éviter les URLs complètes
          const index = match.indexOf('//')
          if (index > -1 && index < match.indexOf(folder)) return match

          if (path.startsWith(basePathWithoutSlash)) return match
          return quote + basePathWithoutSlash + '/' + folder + '/' + path
        })
      }
    }

    if (content !== originalContent) {
      writeFileSync(jsFile, content, 'utf-8')
    }
  }
}

function copyBuildToGlobalDist(project) {
  const projectDistPath = join(project.path, 'dist')
  if (!existsSync(projectDistPath)) throw new Error('Dossier dist introuvable')

  const basePathParts = project.basePath.split('/').filter(p => p)
  const targetPath = join(CONFIG.distDir, ...basePathParts)

  if (existsSync(targetPath)) rmSync(targetPath, { recursive: true, force: true })

  cpSync(projectDistPath, targetPath, { recursive: true })
  fixAbsolutePathsInJS(targetPath, project.basePath)
}

// ============================================================================
// GÉNÉRATION FICHIERS STATIQUES
// ============================================================================

function generateIndexAndConfig(projects) {
  // Index HTML
  const projectsByChapter = {}
  projects.forEach(p => {
    const chapter = p.chapter || 'Autres'
    if (!projectsByChapter[chapter]) projectsByChapter[chapter] = []
    projectsByChapter[chapter].push(p)
  })

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Three.js Journey - Projets</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body { background: #181818; color: #e5e5e5; font-family: monospace; padding: 2rem; }
      h1 { color: #e5e5e5; margin-bottom: 2rem; }
      .chapter-title { color: #a8ffe6; margin-top: 2rem; }
      a { color: #a8ffe6; text-decoration: none; }
      a:hover { color: #82aaff; text-decoration: underline; }
      ul { list-style: none; padding-left: 1rem; }
      li { margin: 0.5rem 0; }
      li:before { content: '├─ '; color: #666; }
    </style>
</head>
<body>
    <h1>Three.js Journey (${projects.length})</h1>
    ${Object.entries(projectsByChapter).map(([chapter, list]) => `
      <div>
        <h2 class="chapter-title">${chapter}</h2>
        <ul>${list.map(p => `<li><a href="${p.basePath}">${p.name}</a></li>`).join('')}</ul>
      </div>
    `).join('')}
</body>
</html>`

  writeFileSync(join(CONFIG.distDir, 'index.html'), html)

  // Vercel Config
  const routes = []
  const rewrites = []
  const staticExt = 'js|css|jpg|png|svg|webp|ico|json|glb|gltf|bin|mp3'

  projects.forEach(p => {
    const base = p.basePath
    const noSlash = base.replace(/\/$/, '')

    routes.push({ src: `${base}(.*\\.(${staticExt}))$`, dest: `${base}$1`, headers: { 'Cache-Control': 'public, max-age=31536000' } })
    routes.push({ src: `${base}textures/(.*)`, dest: `${base}textures/$1` })

    rewrites.push({ source: `${base}:path*`, destination: `${base}index.html` }) // SPA fallback
    rewrites.push({ source: noSlash, destination: `${base}index.html` })
  })

  rewrites.push({ source: '/', destination: '/index.html' })

  writeFileSync(join(__dirname, 'vercel.json'), JSON.stringify({
    version: 2,
    outputDirectory: 'dist',
    routes, rewrites
  }, null, 2))
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('\n🚀 Three.js Journey Build Optimizer\n', 'bright')

  if (HTML_ONLY) {
    log('Mode: HTML Only', 'blue')
    const projects = findProjects()
    if (!existsSync(CONFIG.distDir)) mkdirSync(CONFIG.distDir, { recursive: true })
    generateIndexAndConfig(projects)
    log(`✅ Index généré pour ${projects.length} projets`, 'green')
    return
  }

  // Clean dist
  if (existsSync(CONFIG.distDir)) rmSync(CONFIG.distDir, { recursive: true, force: true })
  mkdirSync(CONFIG.distDir, { recursive: true })

  // Find projects
  const projects = findProjects()
  if (projects.length === 0) {
    log('❌ Aucun projet trouvé', 'red')
    process.exit(1)
  }

  log(`🎯 ${projects.length} projets trouvés`, 'blue')
  log(`⚡️ Concurrence: ${CONFIG.concurrency} threads`, 'blue')
  log(`📦 Cache: ${FORCE_INSTALL ? 'Désactivé (Force)' : 'Activé'}\n`, 'blue')

  const startTime = Date.now()

  // Run builds
  const results = await runConcurrent(projects, processProject, CONFIG.concurrency)

  // Analyse results
  const successCount = results.filter(r => r.success).length
  const failures = results.filter(r => !r.success)

  log('\n' + '='.repeat(50))
  if (failures.length > 0) {
    log(`⚠️  ${failures.length} échecs :`, 'yellow')
    failures.forEach(f => log(`  - ${f.project.name} (${f.step})`, 'red'))
  }

  const successfulProjects = results.filter(r => r.success).map(r => r.project)
  generateIndexAndConfig(successfulProjects)

  // Final Copy for Vercel Public Public
  if (existsSync(CONFIG.publicDir)) rmSync(CONFIG.publicDir, { recursive: true, force: true })
  cpSync(CONFIG.distDir, CONFIG.publicDir, { recursive: true })

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  log(`\n✨ Terminé en ${totalTime}s`, 'bright')
  log(`📊 ${successCount}/${projects.length} succès`, successCount === projects.length ? 'green' : 'yellow')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
