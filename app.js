// Variables globales
let allBooks = [];
let filteredBooks = [];

// Utilitaire pour récupérer une valeur CSV sans se soucier des majuscules/accents
function getVal(row, possibleKeys) {
    if (!row) return '';
    const keys = Object.keys(row);
    for (let pk of possibleKeys) {
        const found = keys.find(k => k.trim().toLowerCase() === pk.toLowerCase());
        if (found && row[found] !== undefined && row[found] !== null) return row[found].toString().trim();
    }
    return '';
}

// Nettoyage HTML pour éviter les failles
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Surlignage du mot-clé dans le résumé
function highlightText(text, search) {
    if (!search) return escapeHtml(text);
    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark class="highlight">$1</mark>');
}

// Affichage du tableau et du compteur
function render() {
    const tbody = document.getElementById('tableBody');
    const countElement = document.getElementById('bookCount');

    if (!tbody) return;

    if (countElement) {
        if (allBooks.length === 0) {
            countElement.textContent = "Aucun livre dans le catalogue.";
        } else if (filteredBooks.length === allBooks.length) {
            countElement.innerHTML = `Total : <span class="results-count-badge">${allBooks.length}</span> livre(s)`;
        } else {
            countElement.innerHTML = `Trouvé(s) : <span class="results-count-badge">${filteredBooks.length}</span> sur ${allBooks.length} livre(s)`;
        }
    }

    if (filteredBooks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Aucun livre ne correspond à votre recherche.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredBooks.map((b, i) => `
        <tr onclick="openModal(${i})">
            <td><span class="cote-badge">${escapeHtml(getVal(b, ['Cote']) || '-')}</span></td>
            <td><b>${escapeHtml(getVal(b, ['Titre']) || 'Sans titre')}</b></td>
            <td>${escapeHtml(getVal(b, ['Auteur']) || '-')}</td>
        </tr>
    `).join('');
}

// Application des filtres de recherche
function applyFilters() {
    const elCote = document.getElementById('fCote');
    const elTitre = document.getElementById('fTitre');
    const elAuteur = document.getElementById('fAuteur');
    const elResume = document.getElementById('fResume');

    const c = elCote ? elCote.value.toLowerCase() : '';
    const t = elTitre ? elTitre.value.toLowerCase() : '';
    const a = elAuteur ? elAuteur.value.toLowerCase() : '';
    const r = elResume ? elResume.value.toLowerCase() : '';

    filteredBooks = allBooks.filter(b => {
        const cote = getVal(b, ['Cote']).toLowerCase();
        const titre = getVal(b, ['Titre']).toLowerCase();
        const auteur = getVal(b, ['Auteur']).toLowerCase();
        const resume = getVal(b, ['Résumé', 'Resume']).toLowerCase();

        return (!c || cote.includes(c)) &&
               (!t || titre.includes(t)) &&
               (!a || auteur.includes(a)) &&
               (!r || resume.includes(r));
    });

    render();
}

// Remise à zéro des filtres
function resetFilters() {
    if (document.getElementById('fCote')) document.getElementById('fCote').value = '';
    if (document.getElementById('fTitre')) document.getElementById('fTitre').value = '';
    if (document.getElementById('fAuteur')) document.getElementById('fAuteur').value = '';
    if (document.getElementById('fResume')) document.getElementById('fResume').value = '';
    applyFilters();
}

// Gestion de la Pop-up (Modal)
function openModal(i) {
    const b = filteredBooks[i];
    if (!b) return;

    const elResume = document.getElementById('fResume');
    const searchTerm = elResume ? elResume.value.trim() : '';

    document.getElementById('mTitre').textContent = getVal(b, ['Titre']) || 'Sans titre';
    document.getElementById('mAuteur').textContent = getVal(b, ['Auteur']) || '-';
    document.getElementById('mCote').textContent = getVal(b, ['Cote']) || '-';
    document.getElementById('mType').textContent = getVal(b, ['Type']) || '-';
    document.getElementById('mDispo').textContent = getVal(b, ['Disponibilité', 'Disponibilite']) || '-';
    document.getElementById('mFond').textContent = getVal(b, ['Fond', 'Fonds']) || '-';
    
    const date = getVal(b, ['Date']);
    const edit = getVal(b, ['Édition', 'Edition']);
    document.getElementById('mDateEdit').textContent = (date || '-') + (edit ? ` (Éd. ${edit})` : '');
    
    document.getElementById('mTome').textContent = getVal(b, ['Tome']) || '-';
    document.getElementById('mTheme').textContent = (getVal(b, ['Thème général', 'Theme general']) || '-') + ' / ' + (getVal(b, ['Thème particulier', 'Theme particulier']) || '-');
    
    const rawResume = getVal(b, ['Résumé', 'Resume']) || 'Aucun résumé renseigné.';
    const mResume = document.getElementById('mResume');
    
    if (searchTerm && rawResume !== 'Aucun résumé renseigné.') {
        mResume.innerHTML = highlightText(rawResume, searchTerm);
    } else {
        mResume.textContent = rawResume;
    }
    
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('active');
}

// --- CHARGEMENT AUTOMATIQUE DEPUIS GITHUB ---
window.addEventListener('DOMContentLoaded', function() {
    const statusEl = document.getElementById('status');

    if (statusEl) {
        statusEl.style.color = 'black';
        statusEl.textContent = "Chargement du catalogue...";
    }

    fetch('livres.csv')
        .then(response => {
            if (!response.ok) throw new Error("Fichier introuvable");
            return response.text();
        })
        .then(csvText => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function(res) {
                    if (res.data && res.data.length > 0) {
                        allBooks = res.data;
                        if (statusEl) {
                            statusEl.style.color = '#16a34a';
                            statusEl.textContent = `✅ ${allBooks.length} livres disponibles`;
                        }
                        applyFilters();
                    } else {
                        if (statusEl) {
                            statusEl.style.color = '#dc2626';
                            statusEl.textContent = "❌ Le catalogue est vide.";
                        }
                    }
                }
            });
        })
        .catch(err => {
            console.error(err);
            if (statusEl) {
                statusEl.style.color = '#dc2626';
                statusEl.textContent = "❌ Impossible de charger le catalogue.";
            }
        });
});