// ==========================================
// VARIABLES GLOBALES
// ==========================================
let allBooks = [];         // Contient tous les livres du catalogue
let filteredBooks = [];    // Contient les livres après filtrage
let currentPage = 1;       // Page courante
const itemsPerPage = 24;   // Nombre de livres affichés par page (ex: 6 lignes de 4 cartes)

// ==========================================
// 1. CHARGEMENT DU CATALOGUE CSV
// ==========================================
window.addEventListener('DOMContentLoaded', function() {
    const statusEl = document.getElementById('status');

    if (statusEl) {
        statusEl.style.color = '#475569';
        statusEl.textContent = "Chargement du catalogue...";
    }

    // Ajout d'un paramètre anti-cache (?v=timestamp)
    fetch('livres.csv?v=' + new Date().getTime())
        .then(response => {
            if (!response.ok) {
                throw new Error(`Fichier introuvable sur le serveur (Erreur ${response.status})`);
            }
            return response.text();
        })
        .then(csvText => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function(res) {
                    if (res.data && res.data.length > 0) {
                        allBooks = res.data;
                        filteredBooks = [...allBooks]; // Au départ, tous les livres sont affichés

                        if (statusEl) {
                            statusEl.style.color = '#16a34a';
                            statusEl.textContent = `✅ ${allBooks.length} livres disponibles`;
                        }

                        // Écouteurs d'événements sur les champs de filtrage
                        setupFilterListeners();

                        // Premier affichage
                        render();
                    } else {
                        if (statusEl) {
                            statusEl.style.color = '#dc2626';
                            statusEl.textContent = "❌ Le fichier CSV semble vide.";
                        }
                    }
                }
            });
        })
        .catch(err => {
            console.error("Erreur de chargement :", err);
            if (statusEl) {
                statusEl.style.color = '#dc2626';
                statusEl.textContent = `❌ Impossible de charger le catalogue : ${err.message}`;
            }
        });
});

// ==========================================
// 2. ÉCOUTEURS D'ÉVÉNEMENTS POUR LES FILTRES
// ==========================================
function setupFilterListeners() {
    const filterIds = ['fCote', 'fTitre', 'fAuteur', 'fResume'];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                currentPage = 1; // Réinitialise à la page 1 lors d'une nouvelle recherche
                applyFilters();
            });
        }
    });
}

// ==========================================
// 3. RECHERCHE & FILTRAGE (SANS ACCENTS)
// ==========================================

// Nettoie une chaîne : minuscules + suppression de tous les accents
function cleanString(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, ""); // Expression Unicode universelle
}

// Récupère la valeur d'une clé dans un objet de livre (gère les variantes d'en-têtes)
function getVal(bookObj, keysArray) {
    if (!bookObj) return '';
    for (let key of keysArray) {
        if (bookObj[key] !== undefined && bookObj[key] !== null) {
            return String(bookObj[key]).trim();
        }
    }
    return '';
}

// Application des filtres de recherche
function applyFilters() {
    const elCote = document.getElementById('fCote');
    const elTitre = document.getElementById('fTitre');
    const elAuteur = document.getElementById('fAuteur');
    const elResume = document.getElementById('fResume');

    const c = cleanString(elCote ? elCote.value : '');
    const t = cleanString(elTitre ? elTitre.value : '');
    const a = cleanString(elAuteur ? elAuteur.value : '');
    const r = cleanString(elResume ? elResume.value : '');

    filteredBooks = allBooks.filter(b => {
        const cote = cleanString(getVal(b, ['Cote']));
        const titre = cleanString(getVal(b, ['Titre']));
        const auteur = cleanString(getVal(b, ['Auteur']));
        const resume = cleanString(getVal(b, ['Résumé', 'Resume']));

        return (!c || cote.includes(c)) &&
               (!t || titre.includes(t)) &&
               (!a || auteur.includes(a)) &&
               (!r || resume.includes(r));
    });

    render();
}

// Securise le texte contre les injections HTML
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 4. AFFICHAGE DES CARTES & PAGINATION
// ==========================================
function render() {
    const grid = document.getElementById('booksGrid');
    const countElement = document.getElementById('bookCount');

    if (!grid) return;

    // Mise à jour du compteur global
    if (countElement) {
        if (allBooks.length === 0) {
            countElement.textContent = "Aucun livre dans le catalogue.";
        } else if (filteredBooks.length === allBooks.length) {
            countElement.innerHTML = `Total : <span class="results-count-badge">${allBooks.length}</span> livre(s)`;
        } else {
            countElement.innerHTML = `Trouvé(s) : <span class="results-count-badge">${filteredBooks.length}</span> sur ${allBooks.length} livre(s)`;
        }
    }

    // Aucun résultat trouvé
    if (filteredBooks.length === 0) {
        grid.innerHTML = '<div class="no-results">Aucun livre ne correspond à votre recherche.</div>';
        renderPagination(0);
        return;
    }

    // Calculs de pagination
    const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const booksToDisplay = filteredBooks.slice(startIndex, endIndex);

    // Génération des cartes (pavés) HTML
    grid.innerHTML = booksToDisplay.map((b, i) => {
        const realIndex = startIndex + i; // Indice réel dans le tableau filtré

        const cote = escapeHtml(getVal(b, ['Cote']) || '-');
        const titre = escapeHtml(getVal(b, ['Titre']) || 'Sans titre');
        const auteur = escapeHtml(getVal(b, ['Auteur']) || 'Auteur inconnu');
        const type = escapeHtml(getVal(b, ['Type']) || '');
        const theme = escapeHtml(getVal(b, ['Thème général', 'Theme general']) || '');

        return `
            <div class="book-card" onclick="openModal(${realIndex})">
                <div class="card-header">
                    <span class="cote-badge">${cote}</span>
                    ${type ? `<span class="type-badge">${type}</span>` : ''}
                </div>
                <h3 class="card-title">${titre}</h3>
                <p class="card-author">✍️ ${auteur}</p>
                ${theme ? `<p class="card-theme">📁 ${theme}</p>` : ''}
                <div class="card-footer">
                    <span>Voir la fiche →</span>
                </div>
            </div>
        `;
    }).join('');

    // Affichage des boutons de pagination
    renderPagination(totalPages);
}

// Génération des boutons de navigation (1, 2, 3...)
function renderPagination(totalPages) {
    const paginationElement = document.getElementById('pagination');
    if (!paginationElement) return;

    if (totalPages <= 1) {
        paginationElement.innerHTML = '';
        return;
    }

    let html = `
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">❮ Précédent</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    html += `
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Suivant ❯</button>
    `;

    paginationElement.innerHTML = html;
}

// Changement de page au clic
function changePage(newPage) {
    currentPage = newPage;
    render();
    const grid = document.getElementById('booksGrid');
    if (grid) {
        grid.scrollIntoView({ behavior: 'smooth' });
    }
}

// ==========================================
// 5. FENÊTRE MODALE (DETAILS D'UN LIVRE)
// ==========================================
function openModal(index) {
    const book = filteredBooks[index];
    if (!book) return;

    const modal = document.getElementById('bookModal');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalContent) return;

    const cote = escapeHtml(getVal(book, ['Cote']) || '-');
    const titre = escapeHtml(getVal(book, ['Titre']) || 'Sans titre');
    const auteur = escapeHtml(getVal(book, ['Auteur']) || 'Inconnu');
    const stat = escapeHtml(getVal(book, ['Statut', 'Disponibilité']) || '-');
    const loc = escapeHtml(getVal(book, ['Localisation', 'Emplacement']) || '-');
    const dep = escapeHtml(getVal(book, ['Département', 'Departement']) || '-');
    const annee = escapeHtml(getVal(book, ['Année', 'Annee']) || '-');
    const type = escapeHtml(getVal(book, ['Type']) || '-');
    const theme = escapeHtml(getVal(book, ['Thème général', 'Theme general']) || '-');
    const subtheme = escapeHtml(getVal(book, ['Sous-thème', 'Sous-theme', 'Thème']) || '-');
    const resume = escapeHtml(getVal(book, ['Résumé', 'Resume']) || 'Aucun résumé disponible pour ce livre.');

    modalContent.innerHTML = `
        <div class="modal-header">
            <span class="cote-badge">${cote}</span>
            <span class="modal-status">${stat}</span>
        </div>
        <h2 class="modal-title">${titre}</h2>
        <p class="modal-author">✍️ <strong>Auteur :</strong> ${auteur}</p>
        <hr class="modal-divider">
        <div class="modal-details-grid">
            <p><strong>Année :</strong> ${annee}</p>
            <p><strong>Type :</strong> ${type}</p>
            <p><strong>Thème :</strong> ${theme}</p>
            <p><strong>Sous-thème :</strong> ${subtheme}</p>
            <p><strong>Localisation :</strong> ${loc}</p>
            <p><strong>Département :</strong> ${dep}</p>
        </div>
        <hr class="modal-divider">
        <div class="modal-resume-section">
            <h3>📖 Résumé</h3>
            <p class="modal-resume-text">${resume}</p>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('bookModal');
    if (modal) modal.style.display = 'none';
}

// Fermeture de la modale si on clique à l'extérieur
window.addEventListener('click', function(e) {
    const modal = document.getElementById('bookModal');
    if (e.target === modal) {
        closeModal();
    }
});