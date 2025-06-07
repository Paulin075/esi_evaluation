const teacherUsername = localStorage.getItem('teacher_username');
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
    'https://pbappvyoenuorjnyxtnp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYXBwdnlvZW51b3Jqbnl4dG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MzU4MzcsImV4cCI6MjA2MzAxMTgzN30.CLryZZiKvIdb4ExIUaYqgq5TuVa3y8Nxwgx8yu0mlZk'
);

// --- Statistiques globales pour les cartes du haut ---
async function fillStatCards() {
    // 1. Score Clarté, Explication, Comportement
    const { data: clarteData } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom))`)
        .eq('evaluations.enseignants.nom', teacherUsername.split(' ')[0])
        .eq('evaluations.enseignants.prenom', teacherUsername.split(' ')[1] || '');

    let scoreClarte = 0, scoreExplication = 0, scoreComportement = 0;
    clarteData?.forEach(r => {
        if (r.criteres?.description) {
            const desc = r.criteres.description.toLowerCase();
            if (desc.includes('claire')) scoreClarte += r.points;
            if (desc.includes('explique') || desc.includes('explication') || desc.includes('structure')) scoreExplication += r.points;
            if (desc.includes('comportement') || desc.includes('participation') || desc.includes('apprenant')) scoreComportement += r.points;
        }
    });
    document.getElementById('score-clarte').textContent = scoreClarte;
    document.getElementById('score-explication').textContent = scoreExplication;
    document.getElementById('score-comportement').textContent = scoreComportement;

    // 4. Classement Année (meilleur enseignant) - ici tu peux afficher juste le score de l'enseignant connecté
    document.getElementById('classement-annee').textContent = teacherUsername;
}

// --- Classement par clarté ---
async function classementClarte() {
    const { data } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom), sessions_evaluation (matieres (nom)))`)
        .eq('evaluations.enseignants.nom', teacherUsername.split(' ')[0])
        .eq('evaluations.enseignants.prenom', teacherUsername.split(' ')[1] || '');

    const stats = {};
    data.forEach(r => {
        if (
            r.criteres?.description &&
            r.criteres.description.toLowerCase().includes('claire')
        ) {
            const enseignant = teacherUsername;
            const matiere = r.evaluations?.sessions_evaluation?.matieres?.nom || '-';
            const key = enseignant + '|' + matiere;
            if (!stats[key]) stats[key] = { enseignant, matiere, score: 0 };
            stats[key].score += r.points;
        }
    });
    const sorted = Object.values(stats).sort((a, b) => b.score - a.score);
    document.querySelector('#table-clarte tbody').innerHTML = sorted
        .map(s =>
            `<tr><td>${s.enseignant}</td><td>${s.matiere}</td><td>${s.score}</td></tr>`
        )
        .join('');
}

// --- Commentaires récents ---
async function loadRecentComments() {
    const { data, error } = await supabase
        .from('evaluations')
        .select('commentaires, enseignants (nom, prenom)')
        .eq('enseignants.nom', teacherUsername.split(' ')[0])
        .eq('enseignants.prenom', teacherUsername.split(' ')[1] || '')
        .order('id', { ascending: false })
        .limit(5);

    const tbody = document.querySelector('#table-comments tbody');
    if (error || !data) {
        tbody.innerHTML = '<tr><td colspan="2">Aucun commentaire</td></tr>';
        return;
    }
    tbody.innerHTML =
        data
            .filter(ev => ev.commentaires && ev.commentaires.trim() !== '')
            .map(ev => `
                <tr>
                    <td>${teacherUsername}</td>
                    <td>${ev.commentaires}</td>
                </tr>
            `)
            .join('') || '<tr><td colspan="2">Aucun commentaire</td></tr>';
}

// --- Statistiques pour Chart.js ---
let statsGlobalChart = null;
let statsCriteresChart = null;

async function renderStatsCharts() {
    // Récupère toutes les réponses de l'enseignant connecté
    const { data } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom))`)
        .eq('evaluations.enseignants.nom', teacherUsername.split(' ')[0])
        .eq('evaluations.enseignants.prenom', teacherUsername.split(' ')[1] || '');

    let scoreClarte = 0, scoreExplication = 0, scoreComportement = 0;
    data?.forEach(r => {
        if (r.criteres?.description) {
            const desc = r.criteres.description.toLowerCase();
            if (desc.includes('claire')) scoreClarte += r.points;
            if (desc.includes('explique') || desc.includes('explication') || desc.includes('structure')) scoreExplication += r.points;
            if (desc.includes('comportement') || desc.includes('participation') || desc.includes('apprenant')) scoreComportement += r.points;
        }
    });

    // Graphique barres (un seul enseignant)
    const ctx1 = document.getElementById('stats-global-chart').getContext('2d');
    if (window.statsGlobalChart) window.statsGlobalChart.destroy();
    window.statsGlobalChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Clarté', 'Explication', 'Comportement'],
            datasets: [{
                label: teacherUsername,
                data: [scoreClarte, scoreExplication, scoreComportement],
                backgroundColor: ['#6366f1', '#10b981', '#f59e42']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { title: { display: true, text: 'Critère' } },
                y: { title: { display: true, text: 'Score' }, beginAtZero: true }
            }
        }
    });

    // Graphique camembert
    const ctx2 = document.getElementById('stats-criteres-chart').getContext('2d');
    if (window.statsCriteresChart) window.statsCriteresChart.destroy();
    window.statsCriteresChart = new Chart(ctx2, {
        type: 'pie',
        data: {
            labels: ['Clarté', 'Explication', 'Comportement'],
            datasets: [{
                data: [scoreClarte, scoreExplication, scoreComportement],
                backgroundColor: ['#6366f1', '#10b981', '#f59e42']
            }]
        },
        options: {
            responsive: true
        }
    });
}

// --- Classements par animation, explication, comportement ---
// Même principe : ajoute le filtre .eq('evaluations.enseignants.nom', ...) et .eq('evaluations.enseignants.prenom', ...)
// Exemple pour classementAnimation :
async function classementAnimation() {
    const { data } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom), sessions_evaluation (matieres (nom)))`)
        .eq('evaluations.enseignants.nom', teacherUsername.split(' ')[0])
        .eq('evaluations.enseignants.prenom', teacherUsername.split(' ')[1] || '');

    const stats = {};
    data.forEach(r => {
        if (
            r.criteres?.description &&
            (r.criteres.description.toLowerCase().includes('participation') ||
             r.criteres.description.toLowerCase().includes('animé'))
        ) {
            const enseignant = teacherUsername;
            const matiere = r.evaluations?.sessions_evaluation?.matieres?.nom || '-';
            const key = enseignant + '|' + matiere;
            if (!stats[key]) stats[key] = { enseignant, matiere, score: 0 };
            stats[key].score += r.points;
        }
    });
    const sorted = Object.values(stats).sort((a, b) => b.score - a.score);
    document.querySelector('#table-animation tbody').innerHTML = sorted
        .map(s =>
            `<tr><td>${s.enseignant}</td><td>${s.matiere}</td><td>${s.score}</td></tr>`
        )
        .join('');
}

// Répète ce schéma pour classementExplication et classementComportement

// --- Appel tout lors du chargement de la page ---
document.addEventListener('DOMContentLoaded', () => {
    fillStatCards();
    loadRecentComments();
    classementClarte();
    classementAnimation();
    classementExplication();
    classementComportement();
    setupSidebarNavigation();
});
async function classementExplication() {
    const { data } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom), sessions_evaluation (matieres (nom)))`)
        .eq('evaluations.enseignants.nom', teacherUsername.split(' ')[0])
        .eq('evaluations.enseignants.prenom', teacherUsername.split(' ')[1] || '');

    const stats = {};
    data.forEach(r => {
        if (
            r.criteres?.description &&
            (r.criteres.description.toLowerCase().includes('explique') ||
             r.criteres.description.toLowerCase().includes('explication') ||
             r.criteres.description.toLowerCase().includes('structure'))
        ) {
            const enseignant = teacherUsername;
            const matiere = r.evaluations?.sessions_evaluation?.matieres?.nom || '-';
            const key = enseignant + '|' + matiere;
            if (!stats[key]) stats[key] = { enseignant, matiere, score: 0 };
            stats[key].score += r.points;
        }
    });
    const sorted = Object.values(stats).sort((a, b) => b.score - a.score);
    // Vérifie que le tbody existe avant de modifier innerHTML
    const tbody = document.querySelector('#table-explication tbody');
    if (tbody) {
        tbody.innerHTML = sorted
            .map(s =>
                `<tr><td>${s.enseignant}</td><td>${s.matiere}</td><td>${s.score}</td></tr>`
            )
            .join('');
    }
}
