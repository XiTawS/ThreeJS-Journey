// Charger la liste des projets depuis le fichier JSON généré lors du build
let projects = []

async function loadProjectsList() {
    try {
        const response = await fetch('/projects.json')
        if (response.ok) {
            projects = await response.json()
        } else {
            console.warn('Impossible de charger projects.json')
            projects = []
        }
    } catch (error) {
        console.error('Erreur lors du chargement des projets:', error)
        projects = []
    }
}

// Fonction pour créer une carte de projet
function createProjectCard(project) {
    const card = document.createElement('a')
    card.href = project.route
    card.className = 'project-card'
    card.setAttribute('data-project-id', project.id)
    
    card.innerHTML = `
        <div class="project-card-content">
            <h2>${project.name}</h2>
            <span class="project-id">${project.id}</span>
        </div>
    `
    
    return card
}

// Charger les projets dans la grille
function displayProjects() {
    const grid = document.getElementById('projects-grid')
    
    if (projects.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary);">Aucun projet trouvé</p>'
        return
    }
    
    projects.forEach(project => {
        const card = createProjectCard(project)
        grid.appendChild(card)
    })
}

// Initialiser la page
document.addEventListener('DOMContentLoaded', async () => {
    await loadProjectsList()
    displayProjects()
})

