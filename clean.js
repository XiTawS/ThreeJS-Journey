import { readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    dirsToRemove: ['dist', 'public'],
    filesToRemove: ['vercel.json'],
    projectDirsToRemove: ['node_modules', 'dist']
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

/**
 * Supprime un dossier/fichier via commande système (rm -rf)
 */
async function systemRemove(path) {
    if (!existsSync(path)) return false

    try {
        // Utilisation de rm -rf de manière séquentielle
        await execAsync(`rm -rf "${path}"`)
        return true
    } catch (error) {
        log(`❌ Erreur suppression ${path}: ${error.message}`, 'red')
        return false
    }
}

// ============================================================================
// PRINCIPAL
// ============================================================================

function findProjects() {
    const projects = []

    function searchDirectory(dir) {
        try {
            const entries = readdirSync(dir, { withFileTypes: true })

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const fullPath = join(dir, entry.name)
                    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue

                    const viteConfigPath = join(fullPath, 'vite.config.js')
                    const packageJsonPath = join(fullPath, 'package.json')

                    if (existsSync(viteConfigPath) && existsSync(packageJsonPath)) {
                        projects.push({ name: entry.name, path: fullPath })
                    } else {
                        searchDirectory(fullPath)
                    }
                }
            }
        } catch (e) {
            // Ignore les erreurs d'accès
        }
    }

    searchDirectory(__dirname)
    return projects
}

async function main() {
    log('\n🧹 Nettoyage Séquentiel (Plus stable)...\n', 'bright')
    const start = Date.now()
    let deletedCount = 0

    // 1. Nettoyage Racine
    log('🏠 Nettoyage racine...', 'blue')

    for (const dir of CONFIG.dirsToRemove) {
        const path = join(__dirname, dir)
        if (await systemRemove(path)) {
            log(`  🗑  ${dir}`, 'reset')
            deletedCount++
        }
    }

    for (const file of CONFIG.filesToRemove) {
        const path = join(__dirname, file)
        if (await systemRemove(path)) {
            log(`  🗑  ${file}`, 'reset')
            deletedCount++
        }
    }

    // 2. Nettoyage Projets
    log('\n🔍 Recherche des projets...', 'blue')
    const projects = findProjects()
    log(`✅ ${projects.length} projets trouvés`, 'green')

    if (projects.length > 0) {
        log('\n📦 Nettoyage projet par projet...', 'blue')

        // Boucle for...of pour garantir le séquentiel (l'un après l'autre)
        for (const project of projects) {
            // process.stdout.write(`  ... ${project.name}\r`) // Feedback visuel sans spam

            let cleaned = false
            for (const dir of CONFIG.projectDirsToRemove) {
                const target = join(project.path, dir)
                if (await systemRemove(target)) {
                    cleaned = true
                }
            }

            if (cleaned) {
                log(`  ✨ Clean: ${project.name}`, 'reset')
                deletedCount++
            }
        }
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1)
    log(`\n✅ Terminé en ${duration}s! ${deletedCount} éléments supprimés.\n`, 'green')
}

main()
