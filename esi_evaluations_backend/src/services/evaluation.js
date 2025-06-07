
import { createClient } from '@supabase/supabase-js';
// Configuration Supabase
const supabaseUrl = 'https://pbappvyoenuorjnyxtnp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYXBwdnlvZW51b3Jqbnl4dG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MzU4MzcsImV4cCI6MjA2MzAxMTgzN30.CLryZZiKvIdb4ExIUaYqgq5TuVa3y8Nxwgx8yu0mlZk' // Remplace par ta clé anon
const supabase = createClient(supabaseUrl, supabaseKey)
// Mapping des critères (doit correspondre à ta base)
const criteresMapping = {
    interest1: 1, interest2: 2, interest3: 3, interest4: 4,
    interest5: 5, interest6: 6, interest7: 7, interest8: 8,
    clarity1: 9, clarity2: 10, clarity3: 11, clarity4: 12,
    relation1: 13, relation2: 14, relation3: 15, relation4: 16,
    relation5: 17, relation6: 18, relation7: 19, relation8: 20,
    organization1: 21, organization2: 22, organization3: 23,
    organization4: 24, organization5: 25, organization6: 26,
    participation1: 27, participation2: 28, participation3: 29,
    participation4: 30, participation5: 31, participation6: 32,
    participation7: 33,
    explanation1: 34, explanation2: 35, explanation3: 36,
    explanation4: 37, explanation5: 38, explanation6: 39,
    explanation7: 40,
    attitude1: 41, attitude2: 42, attitude3: 43, attitude4: 44
}

// Vérifie si l'étudiant a déjà soumis une évaluation
async function checkExistingEvaluation() {
    try {
        const token = getStudentToken();
        if (!token) return;

        const { data, error } = await supabase
            .from('evaluations')
            .select('id')
            .eq('token_etudiant', token)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            showMessage('Vous avez déjà soumis une évaluation. Merci pour votre participation!', 'info');
            const form = document.getElementById('evaluationForm');
            if (form) form.style.display = 'none';
            const submitBtn = document.querySelector('#evaluationForm button[type="submit"]');
            if (submitBtn) submitBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Erreur lors de la vérification d\'évaluation existante:', error);
    }
}

// Validation du formulaire
function setupFormValidation() {
    const form = document.getElementById('evaluationForm')
    if (!form) return

    form.addEventListener('submit', async function(e) {
        e.preventDefault()

        // Validation des champs obligatoires
        const requiredFields = ['teacher', 'course', 'class']
        let isValid = true

        requiredFields.forEach(field => {
            const element = document.getElementById(field)
            if (!element) return

            if (!element.value || element.value.trim() === '') {
                element.style.borderColor = 'red'
                isValid = false
            } else {
                element.style.borderColor = ''
            }
        })

        // Vérifier qu'au moins un critère est évalué
        const anyChecked = document.querySelectorAll('input[type="radio"]:checked').length > 0

        if (!isValid) {
            showMessage('Veuillez remplir tous les champs obligatoires', 'error')
            return
        }

        if (!anyChecked) {
            showMessage('Veuillez évaluer au moins un critère', 'error')
            return
        }

        try {
            await submitEvaluation()
        } catch (error) {
            console.error('Erreur lors de la soumission:', error)
            showErrorMessage('Une erreur est survenue lors de l\'envoi. Veuillez réessayer.')
        }
    })
}

// Affichage de messages
function showMessage(message, type = 'info') {
    let messageElement = document.getElementById('messageBox')
    if (!messageElement) {
        messageElement = document.createElement('div')
        messageElement.id = 'messageBox'
        document.body.appendChild(messageElement)
    }
    messageElement.textContent = message
    messageElement.className = `message ${type}`
    messageElement.style.display = 'block'
    messageElement.style.position = 'fixed'
    messageElement.style.top = '50%'
    messageElement.style.left = '50%'
    messageElement.style.transform = 'translate(-50%, -50%)'
    messageElement.style.background = '#fff'
    messageElement.style.padding = '2rem 2.5rem'
    messageElement.style.borderRadius = '10px'
    messageElement.style.boxShadow = '0 2px 16px rgba(0,0,0,0.15)'
    messageElement.style.fontSize = '1.3rem'
    messageElement.style.fontWeight = 'bold'
    messageElement.style.color = '#e53935' // rouge
    messageElement.style.zIndex = 9999
}
function showErrorMessage(message) {
    showMessage(message, 'error')
}

function sanitizeInput(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/[<>"'`]/g, ''); // retire les caractères spéciaux dangereux
}
      
async function submitEvaluation() {
    document.getElementById('course').disabled = false;
    try {
        // Récupération des champs du formulaire
        const enseignant_id = sanitizeInput(document.getElementById('teacher').value)
        const matiere_id = sanitizeInput(document.getElementById('course').value)
        const classe_id = sanitizeInput(document.getElementById('class').value)
        const commentaires = sanitizeInput(document.getElementById('comments').value)
        const token_etudiant = generateStudentToken()
        storeStudentToken(token_etudiant);
        const reponses = collectResponses()
        console.log({
            enseignant_id,
            matiere_id,
            classe_id,
            commentaires,
            token_etudiant,
            reponses
        });
   
        showLoadingIndicator(true)
       
                // 1. Trouver ou créer la session d'évaluation
                let session_id
                const { data: session, error: sessionError } = await supabase
                    .from('sessions_evaluation')
                    .select('id')
                    .eq('classe_id', classe_id)
                    .eq('matiere_id', matiere_id)
                    .eq('status', 'active')
                    .maybeSingle()

                if (sessionError) throw sessionError

                if (session) {
                    session_id = session.id
                } else {
                    const token_session = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
                    const { data: newSession, error: newSessionError } = await supabase
                        .from('sessions_evaluation')
                        .insert({
                            token: token_session,
                            classe_id: classe_id,
                            matiere_id: matiere_id,
                            status: 'active'
                        })
                        .select()
                        .single()
                    if (newSessionError) throw newSessionError
                    session_id = newSession.id
                }

                // 2. Créer l'évaluation
                const { data: evaluation, error: evalError } = await supabase
                    .from('evaluations')
                    .insert({
                        session_id,
                        enseignant_id,
                        token_etudiant,
                        commentaires
                    })
                    .select()
                    .single();

                if (evalError) throw evalError;

                // 3. Ajouter les réponses
                const { error: reponsesError } = await supabase
                    .from('reponses')
                    .insert(
                        reponses.map(r => ({
                            evaluation_id: evaluation.id,
                            critere_id: r.critere_id,
                            points: r.points
                        }))
                    );

                if (reponsesError) throw reponsesError;

                // 4. Met à jour les résultats agrégés
                await supabase.rpc('update_resultats_enseignants');

                // 5. Confirmation et rechargement
                showMessage('Merci pour votre évaluation et à la prochaine !', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } catch (error) {
                console.error('Erreur lors de la soumission:', error)
                showErrorMessage("Une erreur s'est produite lors de l'envoi de l'évaluation. Veuillez réessayer.")
            } finally {
                showLoadingIndicator(false)
            }
        }
// Collecte les réponses des critères évalués
function collectResponses() {
    const responses = []
    for (const [name, critere_id] of Object.entries(criteresMapping)) {
        const radios = document.getElementsByName(name)
        for (const radio of radios) {
            if (radio.checked) {
                responses.push({ critere_id, points: parseInt(radio.value, 10) })
                break
            }
        }
    }
    return responses
}
// Gestion sécurisée du token étudiant
function getStudentToken() {
    try {
        const existingToken = localStorage.getItem('studentToken')
        if (existingToken) return existingToken
        return generateStudentToken()
    } catch (error) {
        return generateStudentToken()
    }
}
function storeStudentToken(token) {
    try {
        localStorage.setItem('studentToken', token)
    } catch (error) {}
}
function generateStudentToken() {
    return 'anon_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Animation sur les radios
function setupRadioButtonEffects() {
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const row = this.closest('tr')
            if (!row) return
            row.querySelectorAll('.radio-container').forEach(container => {
                container.style.backgroundColor = ''
            })
            if (this.parentNode) {
                this.parentNode.style.backgroundColor = '#e3f2fd'
            }
        })
    })
}

// Amélioration UX : focus sur les selects
function setupSelectEffects() {
    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('focus', function() {
            this.style.borderColor = '#1976d2'
            this.style.boxShadow = '0 0 0 2px #90caf9'
        })
        select.addEventListener('blur', function() {
            this.style.borderColor = ''
            this.style.boxShadow = 'none'
        })
    })
}

// Affiche ou masque l'indicateur de chargement
function showLoadingIndicator(show) {
    let loader = document.getElementById('loadingIndicator')
    if (!loader && show) {
        loader = document.createElement('div')
        loader.id = 'loadingIndicator'
        loader.className = 'loading-spinner'
        loader.innerHTML = '<div class="spinner"></div><p>Traitement en cours...</p>'
        document.body.appendChild(loader)
    }
    if (loader) {
        loader.style.display = show ? 'flex' : 'none'
    }
}
// ...après loadEnseignants et loadClasses...

async function loadEnseignants() {
    const select = document.getElementById('teacher');
    select.innerHTML = '<option value="">-- Sélectionnez l\'enseignant --</option>';
    const { data, error } = await supabase
        .from('enseignants')
        .select('id, nom, prenom')
        .order('nom', { ascending: true });

    if (error) {
        console.error('Erreur chargement enseignants:', error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach(e => {
            select.innerHTML += `<option value="${e.id}">${e.nom} ${e.prenom}</option>`;
        });
    }
}
async function loadClasses() {
    const select = document.getElementById('class');
    select.innerHTML = '<option value="">-- Sélectionnez une classe --</option>';
    const { data, error } = await supabase
        .from('classes')
        .select('id, nom')
        .order('nom', { ascending: true });

    if (error) {
        console.error('Erreur chargement classes:', error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nom}</option>`;
        });
    }
}
async function loadMatieres(enseignantId) {
    const select = document.getElementById('course');
    select.innerHTML = '<option value="">-- Sélectionnez une matière --</option>';
    select.disabled = true;
    if (!enseignantId) return;

    const { data, error } = await supabase
        .from('enseignant_matiere')
        .select('matiere_id, matieres (id, nom)')
        .eq('enseignant_id', enseignantId);

    if (error) {
        console.error('Erreur chargement matières:', error);
        return;
    }

    if (data && data.length > 0) {
        data.forEach(m => {
            if (m.matieres) {
                select.innerHTML += `<option value="${m.matieres.id}">${m.matieres.nom}</option>`;
            }
        });
        select.value = data[0].matieres.id;
        select.disabled = true;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    checkExistingEvaluation();
    loadEnseignants();
    loadClasses();
    setupFormValidation();

    document.getElementById('teacher').addEventListener('change', function() {
        loadMatieres(this.value);
    });
});