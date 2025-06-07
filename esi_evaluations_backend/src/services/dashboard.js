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
        .select(`points, criteres (description)`);
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

    // 4. Classement Année (meilleur enseignant)
    const { data: bestData } = await supabase
        .from('reponses')
        .select(`points, evaluations (enseignants (nom, prenom))`);
    const totals = {};
    bestData?.forEach(r => {
        const enseignant = r.evaluations?.enseignants
            ? r.evaluations.enseignants.nom + ' ' + r.evaluations.enseignants.prenom
            : '-';
        if (!totals[enseignant]) totals[enseignant] = 0;
        totals[enseignant] += r.points;
    });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    document.getElementById('classement-annee').textContent = sorted.length
        ? `#1 : ${sorted[0][0]}`
        : '--';
}

// --- Classement par clarté ---
async function classementClarte() {
    const { data } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom), sessions_evaluation (matieres (nom)))`);
    const stats = {};
    data.forEach(r => {
        if (
            r.criteres?.description &&
            r.criteres.description.toLowerCase().includes('claire')
        ) {
            const enseignant = r.evaluations?.enseignants
                ? r.evaluations.enseignants.nom + ' ' + r.evaluations.enseignants.prenom
                : '-';
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
                    <td>${ev.enseignants ? ev.enseignants.nom : ''}</td>
                    <td>${ev.commentaires}</td>
                </tr>
            `)
            .join('') || '<tr><td colspan="2">Aucun commentaire</td></tr>';
}

// --- Statistiques pour Chart.js ---
let statsGlobalChart = null;
let statsCriteresChart = null;

async function renderStatsCharts() {
    // Récupère toutes les réponses avec les enseignants
    const { data } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom))`);

    // Structure : { enseignant: { clarte: 0, explication: 0, comportement: 0 } }
    const stats = {};

    data?.forEach(r => {
        const enseignant = r.evaluations?.enseignants
            ? r.evaluations.enseignants.nom + ' ' + r.evaluations.enseignants.prenom
            : 'Inconnu';
        if (!stats[enseignant]) stats[enseignant] = { clarte: 0, explication: 0, comportement: 0 };

        if (r.criteres?.description) {
            const desc = r.criteres.description.toLowerCase();
            if (desc.includes('claire')) stats[enseignant].clarte += r.points;
            if (desc.includes('explique') || desc.includes('explication') || desc.includes('structure')) stats[enseignant].explication += r.points;
            if (desc.includes('comportement') || desc.includes('participation') || desc.includes('apprenant')) stats[enseignant].comportement += r.points;
        }
    });

    // Prépare les données pour Chart.js
    const enseignants = Object.keys(stats);
    const clarteScores = enseignants.map(e => stats[e].clarte);
    const explicationScores = enseignants.map(e => stats[e].explication);
    const comportementScores = enseignants.map(e => stats[e].comportement);

    // Graphique barres par enseignant
    const ctx1 = document.getElementById('stats-global-chart').getContext('2d');
    if (window.statsGlobalChart) window.statsGlobalChart.destroy();
    window.statsGlobalChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: enseignants,
            datasets: [
                {
                    label: 'Clarté',
                    data: clarteScores,
                    backgroundColor: '#6366f1'
                },
                {
                    label: 'Explication',
                    data: explicationScores,
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Comportement',
                    data: comportementScores,
                    backgroundColor: '#f59e42'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                x: { title: { display: true, text: 'Enseignant' } },
                y: { title: { display: true, text: 'Score' }, beginAtZero: true }
            }
        }
    });

    // Graphique camembert pour la répartition totale (tous enseignants confondus)
    const totalClarte = clarteScores.reduce((a, b) => a + b, 0);
    const totalExplication = explicationScores.reduce((a, b) => a + b, 0);
    const totalComportement = comportementScores.reduce((a, b) => a + b, 0);

    const ctx2 = document.getElementById('stats-criteres-chart').getContext('2d');
    if (window.statsCriteresChart) window.statsCriteresChart.destroy();
    window.statsCriteresChart = new Chart(ctx2, {
        type: 'pie',
        data: {
            labels: ['Clarté', 'Explication', 'Comportement'],
            datasets: [{
                data: [totalClarte, totalExplication, totalComportement],
                backgroundColor: ['#6366f1', '#10b981', '#f59e42']
            }]
        },
        options: {
            responsive: true
        }
    });
}
// --- Navigation sidebar ---
function setupSidebarNavigation() {
    const navDashboard = document.getElementById('nav-dashboard');
    const navStats = document.getElementById('nav-stats');
    const navClassement = document.getElementById('nav-classement');
    const sectionDashboard = document.getElementById('section-dashboard');
    const sectionStats = document.getElementById('section-stats');
    const sectionClassement = document.getElementById('section-classement');

    function showSection(section) {
        sectionDashboard.style.display = 'none';
        sectionStats.style.display = 'none';
        sectionClassement.style.display = 'none';
        navDashboard.classList.remove('active');
        navStats.classList.remove('active');
        navClassement.classList.remove('active');
        if (section === 'dashboard') {
            sectionDashboard.style.display = '';
            navDashboard.classList.add('active');
        } else if (section === 'stats') {
            sectionStats.style.display = '';
            navStats.classList.add('active');
            renderStatsCharts();
        } else if (section === 'classement') {
            sectionClassement.style.display = '';
            navClassement.classList.add('active');
        }
    }

    navDashboard.addEventListener('click', e => {
        e.preventDefault();
        showSection('dashboard');
    });
    navStats.addEventListener('click', e => {
        e.preventDefault();
        showSection('stats');
    });
    navClassement.addEventListener('click', e => {
        e.preventDefault();
        showSection('classement');
    });

    // Affiche le dashboard par défaut
    showSection('dashboard');
}

// --- Appel tout lors du chargement de la page ---
document.addEventListener('DOMContentLoaded', () => {
    fillStatCards();
    loadRecentComments();
    classementClarte();
    setupSidebarNavigation();
});
// Classement par animation (participation)
async function classementAnimation() {
    const { data } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom), sessions_evaluation (matieres (nom)))`);
    const stats = {};
    data.forEach(r => {
        if (
            r.criteres?.description &&
            (r.criteres.description.toLowerCase().includes('participation') ||
             r.criteres.description.toLowerCase().includes('animé'))
        ) {
            const enseignant = r.evaluations?.enseignants
                ? r.evaluations.enseignants.nom + ' ' + r.evaluations.enseignants.prenom
                : '-';
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

// Classement par explication
async function classementExplication() {
    const { data } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom), sessions_evaluation (matieres (nom)))`);
    const stats = {};
    data.forEach(r => {
        if (
            r.criteres?.description &&
            (r.criteres.description.toLowerCase().includes('explique') ||
             r.criteres.description.toLowerCase().includes('explication') ||
             r.criteres.description.toLowerCase().includes('structure'))
        ) {
            const enseignant = r.evaluations?.enseignants
                ? r.evaluations.enseignants.nom + ' ' + r.evaluations.enseignants.prenom
                : '-';
            const matiere = r.evaluations?.sessions_evaluation?.matieres?.nom || '-';
            const key = enseignant + '|' + matiere;
            if (!stats[key]) stats[key] = { enseignant, matiere, score: 0 };
            stats[key].score += r.points;
        }
    });
    const sorted = Object.values(stats).sort((a, b) => b.score - a.score);
    document.querySelector('#table-explication tbody').innerHTML = sorted
        .map(s =>
            `<tr><td>${s.enseignant}</td><td>${s.matiere}</td><td>${s.score}</td></tr>`
        )
        .join('');
}

// Classement par comportement
async function classementComportement() {
    const { data } = await supabase
        .from('reponses')
        .select(`points, criteres (description), evaluations (enseignants (nom, prenom), sessions_evaluation (matieres (nom)))`);
    const stats = {};
    data.forEach(r => {
        if (
            r.criteres?.description &&
            (r.criteres.description.toLowerCase().includes('comportement') ||
             r.criteres.description.toLowerCase().includes('apprenant'))
        ) {
            const enseignant = r.evaluations?.enseignants
                ? r.evaluations.enseignants.nom + ' ' + r.evaluations.enseignants.prenom
                : '-';
            const matiere = r.evaluations?.sessions_evaluation?.matieres?.nom || '-';
            const key = enseignant + '|' + matiere;
            if (!stats[key]) stats[key] = { enseignant, matiere, score: 0 };
            stats[key].score += r.points;
        }
    });
    const sorted = Object.values(stats).sort((a, b) => b.score - a.score);
    document.querySelector('#table-comportement tbody').innerHTML = sorted
        .map(s =>
            `<tr><td>${s.enseignant}</td><td>${s.matiere}</td><td>${s.score}</td></tr>`
        )
        .join('');
}
document.addEventListener('DOMContentLoaded', () => {
    fillStatCards();
    loadRecentComments();
    classementClarte();
    classementAnimation();
    classementExplication();
    classementComportement();
    setupSidebarNavigation();
});