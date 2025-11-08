import fs from 'fs'
import path from 'path'

const projectsDir = '.' // racine du repo
const folders = fs.readdirSync(projectsDir).filter(f =>
  fs.statSync(path.join(projectsDir, f)).isDirectory()
)

const builds = []
const routes = []

folders.forEach(folder => {
  const viteConfigPath = path.join(folder, 'vite.config.js')
  const distDir = path.join(folder, 'dist')

  if (fs.existsSync(viteConfigPath)) {
    builds.push({
      src: viteConfigPath,
      use: '@vercel/static-build',
      config: { distDir }
    })

    routes.push({
      src: `/${folder}/(.*)`,
      dest: `${distDir}/$1`
    })
  }
})

const vercelConfig = {
  version: 3,
  builds,
  routes
}

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2))
console.log('✅ vercel.json généré automatiquement !')