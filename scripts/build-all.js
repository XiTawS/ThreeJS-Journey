import { execSync } from 'child_process'
import { readdirSync, statSync, cpSync, rmSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// Fonction pour détecter automatiquement les projets
function detectProjects() {
    const rootDir = process.cwd()
    const entries = readdirSync(rootDir, { withFileTypes: true })
    const projects = []
    
    for (const entry of entries) {
        // Ignorer les dossiers qui ne sont pas des projets (node_modules, dist, src, scripts, etc.)
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

const projects = detectProjects()
console.log(`📋 Projets détectés: ${projects.join(', ')}\n`)

console.log('🚀 Building all projects...\n')

// Clean main dist directory
const mainDistPath = join(process.cwd(), 'dist')
if (existsSync(mainDistPath)) {
    rmSync(mainDistPath, { recursive: true, force: true })
}
mkdirSync(mainDistPath, { recursive: true })

// Build homepage first
console.log('📦 Building homepage...')
try {
    execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() })
    console.log('✅ Homepage built successfully\n')
} catch (error) {
    console.error('❌ Failed to build homepage:', error.message)
    process.exit(1)
}

// Build each project and copy to main dist
for (const project of projects) {
    const projectPath = join(process.cwd(), project)
    
    try {
        // Check if project directory exists
        if (!statSync(projectPath).isDirectory()) {
            console.log(`⏭️  Skipping ${project} (directory not found)`)
            continue
        }
        
        console.log(`📦 Building ${project}...`)
        
        // Install dependencies if node_modules doesn't exist
        const nodeModulesPath = join(projectPath, 'node_modules')
        try {
            statSync(nodeModulesPath)
        } catch {
            console.log(`   Installing dependencies for ${project}...`)
            execSync('npm install', { stdio: 'inherit', cwd: projectPath })
        }
        
        // Build the project
        execSync('npm run build', { stdio: 'inherit', cwd: projectPath })
        
        // Copy built files to main dist with project name as subfolder
        const projectDistPath = join(projectPath, 'dist')
        const targetPath = join(mainDistPath, project)
        
        if (existsSync(projectDistPath)) {
            cpSync(projectDistPath, targetPath, { recursive: true })
            
            // Fix paths in index.html to work from subdirectory
            const indexHtmlPath = join(targetPath, 'index.html')
            if (existsSync(indexHtmlPath)) {
                let htmlContent = readFileSync(indexHtmlPath, 'utf-8')
                
                // Add base tag if not present
                if (!htmlContent.includes('<base')) {
                    htmlContent = htmlContent.replace(
                        '<head>',
                        `<head>\n    <base href="/${project}/">`
                    )
                }
                
                // Fix absolute paths in script tags and other assets (but not in inline scripts)
                // Only fix paths in href and src attributes
                htmlContent = htmlContent.replace(/href="\/([^"]+)"/g, (match, path) => {
                    // Skip if it's already a full URL or starts with //
                    if (path.startsWith('//') || path.includes('://')) return match;
                    return `href="/${project}/${path}"`;
                });
                htmlContent = htmlContent.replace(/src="\/([^"]+)"/g, (match, path) => {
                    if (path.startsWith('//') || path.includes('://')) return match;
                    return `src="/${project}/${path}"`;
                });
                
                // Inject path fix script - must be loaded early
                const pathFixScript = `<script>
(function() {
    'use strict';
    const baseTag = document.querySelector('base');
    const basePath = baseTag ? baseTag.getAttribute('href') : window.location.pathname.split('/').slice(0, -1).join('/') + '/';
    
    // Function to fix paths
    function fixPath(url) {
        if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('://')) {
            return basePath + url.substring(1);
        }
        return url;
    }
    
    // Patch THREE.TextureLoader when THREE is available
    function patchTextureLoader() {
        if (typeof window.THREE !== 'undefined' && window.THREE.TextureLoader) {
            const TextureLoader = window.THREE.TextureLoader;
            if (!TextureLoader.prototype._pathFixed) {
                const originalLoad = TextureLoader.prototype.load;
                TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
                    url = fixPath(url);
                    return originalLoad.call(this, url, onLoad, onProgress, onError);
                };
                TextureLoader.prototype._pathFixed = true;
            }
        }
    }
    
    // Try to patch immediately if THREE is already loaded
    patchTextureLoader();
    
    // Also patch when THREE becomes available (for async module loading)
    const checkThree = setInterval(function() {
        if (typeof window.THREE !== 'undefined') {
            patchTextureLoader();
            clearInterval(checkThree);
        }
    }, 10);
    
    // Clear interval after 5 seconds
    setTimeout(function() {
        clearInterval(checkThree);
    }, 5000);
    
    // Patch fetch for other resources
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        if (typeof input === 'string') {
            input = fixPath(input);
        }
        return originalFetch.call(this, input, init);
    };
})();
</script>`;
                
                // Insert the script right after <head> or before first script
                if (htmlContent.includes('</head>')) {
                    htmlContent = htmlContent.replace('</head>', pathFixScript + '\n</head>');
                } else if (htmlContent.includes('<script')) {
                    htmlContent = htmlContent.replace(/(<script[^>]*>)/, pathFixScript + '\n$1');
                }
                
                writeFileSync(indexHtmlPath, htmlContent)
            }
            
            console.log(`✅ ${project} built and copied successfully\n`)
        } else {
            console.log(`⚠️  ${project} dist folder not found after build\n`)
        }
    } catch (error) {
        console.error(`❌ Failed to build ${project}:`, error.message)
        // Continue with other projects even if one fails
    }
}

// Générer un fichier JSON avec la liste des projets pour la page d'accueil
const projectsData = projects.map(project => ({
    id: project,
    name: project.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    route: `/${project}`
}))

const projectsJsonPath = join(mainDistPath, 'projects.json')
writeFileSync(projectsJsonPath, JSON.stringify(projectsData, null, 2))
console.log(`📝 Liste des projets sauvegardée dans projects.json\n`)

console.log('🎉 All builds completed!')

