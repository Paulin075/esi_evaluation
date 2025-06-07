
// Connexion Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const supabaseUrl = 'https://pbappvyoenuorjnyxtnp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYXBwdnlvZW51b3Jqbnl4dG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MzU4MzcsImV4cCI6MjA2MzAxMTgzN30.CLryZZiKvIdb4ExIUaYqgq5TuVa3y8Nxwgx8yu0mlZk'
const supabase = createClient(supabaseUrl, supabaseKey)

// Charger enseignants + matière
async function loadEnseignants() {
    const { data, error } = await supabase
        .from('enseignants')
        .select('id, nom, prenom, email, status, enseignant_matiere(matieres(nom))')
    const tbody = document.getElementById('enseignants-table')
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Erreur de chargement</td></tr>`
        return
    }
    tbody.innerHTML = data.map(e => `
        <tr>
            <td>${e.nom}</td>
            <td>${e.prenom}</td>
            <td>${e.email}</td>
            <td>${e.status}</td>
            <td>
                ${e.enseignant_matiere && e.enseignant_matiere.length > 0
                    ? e.enseignant_matiere.map(em => em.matieres?.nom).filter(Boolean).join(', ')
                    : '<em>Aucune</em>'}
            </td>
            <td>
                <button class="delete-enseignant-btn" data-id="${e.id}">Supprimer</button>
            </td>
        </tr>
    `).join('')
    // Suppression
    document.querySelectorAll('.delete-enseignant-btn').forEach(btn => {
        btn.onclick = async () => {
            if(confirm("Supprimer cet enseignant ?")) {
                await supabase.from('enseignants').delete().eq('id', btn.dataset.id)
                loadEnseignants()
            }
        }
    })
}

// Ajout d'un enseignant (popup simple)
document.getElementById('add-enseignant-btn').onclick = async () => {
    const nom = prompt("Nom de l'enseignant :")
    if (!nom) return
    const prenom = prompt("Prénom :")
    if (!prenom) return
    const email = prompt("Email :")
    if (!email) return
    const status = prompt("Status (ex: actif) :")
    if (!status) return
    // Ajout enseignant
    const { data, error } = await supabase.from('enseignants').insert([{ nom, prenom, email, status }]).select().single()
    if (error) return alert("Erreur lors de l'ajout")
    // Associer une matière
    const matiere = prompt("Nom de la matière enseignée :")
    if (matiere) {
        // Cherche l'id de la matière
        const { data: matieres } = await supabase.from('matieres').select('id').eq('nom', matiere).single()
        if (matieres && matieres.id) {
            await supabase.from('enseignant_matiere').insert([{ enseignant_id: data.id, matiere_id: matieres.id }])
        }
    }
    loadEnseignants()
}

// Charger à l'ouverture de la section
document.querySelector('[data-section="enseignants"]').addEventListener('click', loadEnseignants)
