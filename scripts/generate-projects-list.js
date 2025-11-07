import { readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// Fonction pour détecter automatiquement les projets
function detectProjects() {
    const rootDir = process.cwd()
    const entries = readdirSync(rootDir, { withFileTypes: true })
    const projects = []
    
    for (const entry of entries) {
        // Ignorer les dossiers qui ne sont pas des projets
        if (!entry.isDirectory()) continue
        
        const folderName = entry.name
        const ignorePatterns = [
            'node_modules', 'dist', 'src', 'scripts', '.git', 
            '.vscode', '.idea', 'static', 'assets'
        ]
        
        // Ignorer les dossiers système et de configuration
        if (ignorePatterns.includes(folderName) || folderName.startsWith('.')) {
            continue
        }
        
        // Vérifier si c'est un projet Vite (doit avoir package.json et vite.config.js)
        const projectPath = join(rootDir, folderName)
        const hasPackageJson = existsSync(join(projectPath, 'package.json'))
        const hasViteConfig = existsSync(join(projectPath, 'vite.config.js')) || 
                             existsSync(join(projectPath, 'vite.config.ts'))
        
        // Vérifier aussi s'il y a un dossier src avec index.html
        const hasSrcIndex = existsSync(join(projectPath, 'src', 'index.html'))
        
        if (hasPackageJson && (hasViteConfig || hasSrcIndex)) {
            projects.push(folderName)
        }
    }
    
    // Trier les projets par ordre numérique/alphabetique
    return projects.sort((a, b) => {
        // Extraire les numéros du début si présents
        const numA = parseInt(a.match(/^\d+/)?.[0] || '999')
        const numB = parseInt(b.match(/^\d+/)?.[0] || '999')
        return numA - numB
    })
}

// Générer le fichier projects.json
const projects = detectProjects()
const projectsData = projects.map(project => ({
    id: project,
    name: project.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    route: `/${project}`
}))

// Créer le dossier public si nécessaire (pour dev)
const publicDir = join(process.cwd(), 'public')
if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true })
}

// Écrire dans public pour le dev et dist pour le build
const publicJsonPath = join(publicDir, 'projects.json')
const distJsonPath = join(process.cwd(), 'dist', 'projects.json')

writeFileSync(publicJsonPath, JSON.stringify(projectsData, null, 2))
console.log(`✅ Liste des projets générée: ${projects.length} projets trouvés`)
console.log(`   - ${publicJsonPath}`)

// Écrire aussi dans dist si le dossier existe
if (existsSync(join(process.cwd(), 'dist'))) {
    writeFileSync(distJsonPath, JSON.stringify(projectsData, null, 2))
    console.log(`   - ${distJsonPath}`)
}

