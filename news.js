// ============================================================
// NEWS.JS — Fetch JSON + card stack + filtrage par catégorie
// ============================================================

let currentCardIndex = 0;
let isScrolling      = false;
let allArticles      = [];       // Cache de tous les articles fetchés
let activeFilter     = null;     // Catégorie active ou null

// ==================== POINT D'ENTRÉE ====================
// Appelée par player.js à l'ouverture de la page News

function initNewsPage() {
    currentCardIndex = 0;
    isScrolling      = false;
    activeFilter     = null;
    fetchNews();
}

// ==================== FETCH DES DONNÉES ====================

async function fetchNews() {
    const newsStack     = document.getElementById('newsStack');
    const timelineDates = document.getElementById('timelineDates');
    if (!newsStack || !timelineDates) return;

    // État de chargement
    newsStack.innerHTML = `
        <div style="
            display: flex; align-items: center; justify-content: center;
            height: 70vh; color: rgba(255,255,255,0.4);
            font-size: 1.2vw; letter-spacing: 0.1em;
        ">
            Chargement des actualités…
        </div>
    `;

    try {
        const response = await fetch('data/news.json');

        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }

        allArticles = await response.json();
        renderNews(allArticles);

    } catch (error) {
        console.error('Impossible de charger les actualités :', error);
        renderError();
    }
}

// ==================== RENDU DES CARDS ====================

function renderNews(articles) {
    const newsStack     = document.getElementById('newsStack');
    const timelineDates = document.getElementById('timelineDates');

    newsStack.innerHTML    = '';
    timelineDates.innerHTML = '';

    articles.forEach((article, index) => {

        // --- Card ---
        const card = document.createElement('article');
        card.className        = 'news-stack-card';
        card.dataset.index    = index;
        card.dataset.date     = article.date;
        card.dataset.category = article.category;

        card.innerHTML = `
            <div class="card-border"></div>
            <div class="card-content">
                <div class="card-image">
                    <img
                        src="${article.image}"
                        alt="${article.title}"
                        onerror="this.style.background='${fallbackGradient(article.category)}'; this.src=''; this.style.display='block';"
                    >
                </div>
                <div class="card-info">
                    <span class="card-category ${article.category} card-category-filter" data-category="${article.category}">
                        ${article.categoryLabel}
                    </span>
                    <h2 class="card-title">${article.title}</h2>
                    <p class="card-description">${article.description}</p>
                    <button class="card-read-btn">
                        <span>Lire l'article complet</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Clic sur le badge catégorie → filtrer
        const badge = card.querySelector('.card-category-filter');
badge.style.cursor = 'pointer';
badge.style.setProperty('--fill-color', badgeColor(article.category));

badge.addEventListener('click', (e) => {
    e.stopPropagation();
    applyFilter(article.category, article.categoryLabel);
});

        newsStack.appendChild(card);

        // --- Date dans la timeline ---
        const dateItem = document.createElement('div');
        dateItem.className = 'timeline-date-item';
        if (index === 0) dateItem.classList.add('active');
        dateItem.innerHTML = `<div class="timeline-date-text">${article.date}</div>`;
        dateItem.addEventListener('click', () => jumpToCard(index));
        timelineDates.appendChild(dateItem);
    });

    currentCardIndex = 0;
    updateCardPositions();
    attachScrollHandler();
}

// ==================== FILTRAGE ====================

function applyFilter(category, label) {
    if (activeFilter === category) return;
    activeFilter = category;

    const filtered = allArticles.filter(a => a.category === category);
    showFilterBadge(label, category);
    renderNews(filtered);
}

function clearFilter() {
    activeFilter = null;
    removeFilterBadge();
    renderNews(allArticles);
}

// ==================== BADGE FILTRE ACTIF ====================

function showFilterBadge(label, category) {
    removeFilterBadge();

    const colors = {
        album:     '#667eea',
        interview: '#10d164',
        festival:  '#f093fb',
        divers : '#f093fb',
    };
    const color = colors[category] || 'rgba(230,201,19,0.8)';

    const badge = document.createElement('div');
    badge.id = 'activeFilterBadge';
    badge.style.cssText = `
        position: absolute;
        top: 1.5vw;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 0.6vw;
        padding: 0.5vw 1.2vw 0.5vw 1.4vw;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(12px);
        border: 1px solid ${color};
        border-radius: 3vw;
        color: ${color};
        font-size: 0.9vw;
        font-weight: 600;
        z-index: 60;
        animation: filterBadgeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        white-space: nowrap;
    `;

    badge.innerHTML = `
        <span>${label}</span>
        <button onclick="clearFilter()" style="
            background: none;
            border: none;
            color: ${color};
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0.1vw;
            margin-left: 0.2vw;
            opacity: 0.7;
            transition: opacity 0.2s, transform 0.2s;
            font-size: 1.1vw;
            line-height: 1;
        "
        onmouseover="this.style.opacity='1'; this.style.transform='scale(1.2)'"
        onmouseout="this.style.opacity='0.7'; this.style.transform='scale(1)'"
        aria-label="Supprimer le filtre">✕</button>
    `;

    const container = document.querySelector('.news-container');
    if (container) {
        container.style.position = 'relative';
        container.appendChild(badge);
    }
}

function removeFilterBadge() {
    const badge = document.getElementById('activeFilterBadge');
    if (badge) badge.remove();
}

// ==================== AFFICHAGE D'ERREUR ====================

function renderError() {
    const newsStack = document.getElementById('newsStack');
    newsStack.innerHTML = `
        <div style="
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; height: 70vh; gap: 1.5vw;
            text-align: center;
        ">
            <span style="font-size: 3vw;">📡</span>
            <p style="color: rgba(255,255,255,0.6); font-size: 1.2vw;">
                Impossible de charger les actualités.
            </p>
            <p style="color: rgba(255,255,255,0.3); font-size: 0.9vw;">
                Vérifiez votre connexion ou réessayez plus tard.
            </p>
            <button onclick="fetchNews()" style="
                margin-top: 1vw; padding: 0.8vw 2vw;
                background: rgba(230,201,19,0.1);
                border: 1px solid rgba(230,201,19,0.4);
                color: rgb(230,201,19); border-radius: 3vw;
                cursor: pointer; font-size: 1vw;
            ">
                Réessayer
            </button>
        </div>
    `;
}

// ==================== COULEUR FALLBACK IMAGE ====================

function fallbackGradient(category) {
    const gradients = {
        album:     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        interview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        festival:  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        divers : 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    };
    return gradients[category] || 'linear-gradient(135deg, #333 0%, #111 100%)';
}


// ==================== COULEUR SURVOL CATEGORY ====================

function badgeColor(category) {
    const colors = {
        album:      '#667eea',
        interview:  '#10d164',
        festival:   '#f093fb',
        actualités: '#fcb69f',
    };
    return colors[category] || 'rgba(230,201,19,0.8)';
}

// ==================== SCROLL & NAVIGATION ====================

function attachScrollHandler() {
    const newsStack = document.getElementById('newsStack');
    if (!newsStack) return;
    newsStack.removeEventListener('wheel', handleNewsScroll);
    newsStack.addEventListener('wheel', handleNewsScroll, { passive: false });
}

function handleNewsScroll(e) {
    if (isScrolling) return;

    const cards      = document.querySelectorAll('.news-stack-card');
    const totalCards = cards.length;

    if (e.deltaY > 0 && currentCardIndex < totalCards - 1) {
        e.preventDefault();
        isScrolling = true;
        currentCardIndex++;
        updateCardPositions();
        setTimeout(() => isScrolling = false, 600);

    } else if (e.deltaY < 0 && currentCardIndex > 0) {
        e.preventDefault();
        isScrolling = true;
        currentCardIndex--;
        updateCardPositions();
        setTimeout(() => isScrolling = false, 600);
    }
}

function updateCardPositions() {
    const cards     = document.querySelectorAll('.news-stack-card');
    const dateItems = document.querySelectorAll('.timeline-date-item');

    cards.forEach((card, index) => {
        const relativeIndex = index - currentCardIndex;
        card.classList.toggle('scrolled-up', relativeIndex < 0);
        card.setAttribute('data-index', relativeIndex);
    });

    dateItems.forEach((item, index) => {
        item.classList.toggle('active', index === currentCardIndex);
    });
}

function jumpToCard(index) {
    if (isScrolling) return;
    isScrolling      = true;
    currentCardIndex = index;
    updateCardPositions();
    setTimeout(() => isScrolling = false, 600);
}