const CLE_UNIQUE = "ENSEIGNANT2024"; // à personnaliser

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const key = document.getElementById('teacher-key').value.trim();
    const username = document.getElementById('teacher-name').value.trim().toLowerCase();
    const errorDiv = document.getElementById('login-error');

    if (key !== CLE_UNIQUE) {
        errorDiv.textContent = "Clé d'accès incorrecte.";
        return;
    }

    // Stocke le nom d'utilisateur dans le localStorage pour l'utiliser sur le dashboard
    localStorage.setItem('teacher_username', username);

    // Redirige vers le dashboard
    window.location.href = "dashboard.html";
});

// Au début de dashboard.js
const teacherUsername = localStorage.getItem('teacher_username');

// Dans tes requêtes, filtre par le nom/prénom/email selon ta base
const { data } = await supabase
    .from('reponses')
    .select(`...`)
    .eq('evaluations.enseignants.nom', teacherUsername); // adapte selon ta structure
document.getElementById('teacher-name').textContent = teacherUsername;