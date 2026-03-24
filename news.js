// ============================================================
// NEWS.JS — Chargement des articles via fetch + card stack
// ============================================================

let currentCardIndex = 0;
let isScrolling      = false;

// ==================== FETCH DES DONNÉES ====================

async function fetchNews() {
    const newsStack     = document.getElementById('newsStack');
    const timelineDates = document.getElementById('timelineDates');
    if (!newsStack || !timelineDates) return;

    // Afficher un état de chargement
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

        const articles = await response.json();
        renderNews(articles);

    } catch (error) {
        console.error('Impossible de charger les actualités :', error);
        renderError();
    }
}

// ==================== RENDU DES CARDS ====================

function renderNews(articles) {
    const newsStack     = document.getElementById('newsStack');
    const timelineDates = document.getElementById('timelineDates');

    // Vider les conteneurs
    newsStack.innerHTML    = '';
    timelineDates.innerHTML = '';

    // Générer chaque card depuis le JSON
    articles.forEach((article, index) => {
        // --- Card ---
        const card = document.createElement('article');
        card.className   = 'news-stack-card';
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
                        onerror="this.style.background='${fallbackGradient(article.category)}'; this.style.display='block'; this.src='';"
                    >
                </div>
                <div class="card-info">
                    <span class="card-category ${article.category}">${article.categoryLabel}</span>
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

        newsStack.appendChild(card);

        // --- Date dans la timeline ---
        const dateItem = document.createElement('div');
        dateItem.className = 'timeline-date-item';
        if (index === 0) dateItem.classList.add('active');
        dateItem.innerHTML = `<div class="timeline-date-text">${article.date}</div>`;
        dateItem.addEventListener('click', () => jumpToCard(index));
        timelineDates.appendChild(dateItem);
    });

    // Initialiser les positions et les événements
    currentCardIndex = 0;
    updateCardPositions();
    attachScrollHandler();
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
                transition: background 0.3s;
            ">
                Réessayer
            </button>
        </div>
    `;
}

// ==================== COULEUR DE FALLBACK ====================

function fallbackGradient(category) {
    const gradients = {
        album:     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        interview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        festival:  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        streaming: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        vinyl:     'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    };
    return gradients[category] || 'linear-gradient(135deg, #333 0%, #111 100%)';
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

// ==================== POINT D'ENTRÉE ====================
// Appelée par player.js lors de l'ouverture de la page News

function initNewsPage() {
    currentCardIndex = 0;
    isScrolling      = false;
    fetchNews();
}