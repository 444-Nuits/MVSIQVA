// ============================================================
// NEWS.JS — News feed — card stack, category filter, article modal
//
// ARCHITECTURE
// ┌─────────────────────────────────────────────────┐
// │  DATA LAYER     fetchNews()                     │
// │                 → fetch() on data/news.json (local mock data)    │
// ├─────────────────────────────────────────────────┤
// │  LOGIC LAYER    initNewsPage / filter / scroll  │
// │                 → state, filtering, card navigation    │
// ├─────────────────────────────────────────────────┤
// │  UI LAYER       renderNews / renderError        │
// │                 → DOM manipulation only   │
// └─────────────────────────────────────────────────┘
// ============================================================

let currentCardIndex = 0;    // Index of the card currently shown at the front of the stack
let isScrolling      = false; // Prevents multiple scroll events firing during a card transition
let allArticles      = [];   // Full article list — kept in memory for filtering without re-fetching
let activeFilter     = null; // Currently selected category (null = show all articles)

// ============================================================
// LOGIC LAYER — Entry point, global state
// ============================================================

// ==================== ENTRY POINT ====================
// Called by player.js every time the user navigates to the News page
// Resets state so the feed starts fresh each visit

function initNewsPage() {
    currentCardIndex = 0;
    isScrolling      = false;
    activeFilter     = null;
    fetchNews();
}

// ============================================================
// DATA LAYER — Data loading (news.json local mock)
// ============================================================

// ==================== FETCH DATA ====================

async function fetchNews() {
    const newsStack     = document.getElementById('newsStack');
    const timelineDates = document.getElementById('timelineDates');
    if (!newsStack || !timelineDates) return;

    // Show a skeleton placeholder card while the real data loads
    // This gives visual feedback immediately instead of a blank screen
    newsStack.innerHTML = `
        <div class="news-stack-card" style="pointer-events:none;">
            <div class="card-border"></div>
            <div class="card-content">
                <div class="card-image skeleton-block" style="border-radius:0;"></div>
                <div class="card-info" style="gap:1.2vw;">
                    <div class="skeleton-block" style="width:30%;height:1.2vw;border-radius:3vw;"></div>
                    <div class="skeleton-block" style="width:80%;height:2.5vw;border-radius:8px;"></div>
                    <div class="skeleton-block" style="width:90%;height:1vw;border-radius:4px;"></div>
                    <div class="skeleton-block" style="width:70%;height:1vw;border-radius:4px;"></div>
                </div>
            </div>
        </div>`;

    try {
        // Fetch local JSON file — treated as a REST call (async, same fetch API as a real backend)
        const response = await fetch('data/news.json');
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        allArticles = await response.json(); // Parse JSON and store in memory
        renderNews(allArticles); // Render all articles on first load
    } catch (error) {
        console.error('Could not load news:', error);
        renderError();
    }
}

// ============================================================
// UI LAYER — DOM rendering, cards, article modal
// ============================================================

// ==================== RENDER CARDS ====================

function renderNews(articles) {
    const newsStack      = document.getElementById('newsStack');
    const timelineDates  = document.getElementById('timelineDates');

    newsStack.innerHTML     = '';
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
                    <button class="card-read-btn" ${!article.article ? 'style="opacity:0.4;cursor:default;"' : ''}>
                        <span>Read full article</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Clicking a category badge filters the feed to show only that category
        const badge = card.querySelector('.card-category-filter');
        badge.style.cursor = 'pointer';
        badge.style.setProperty('--fill-color', badgeColor(article.category));
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            applyFilter(article.category, article.categoryLabel);
        });

        // Clicking "Read full article" opens a full-screen modal with the article content
        const readBtn = card.querySelector('.card-read-btn');
        if (article.article) {
            readBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openArticleModal(article);
            });
        }

        newsStack.appendChild(card);

        // --- Timeline dot on the right side — clicking it jumps to that card ---
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

// ==================== ARTICLE MODAL ====================

function openArticleModal(article) {
    const existing = document.getElementById('articleModal');
    if (existing) existing.remove();

    const color = badgeColor(article.category);

    const modal = document.createElement('div');
    modal.id = 'articleModal';
    modal.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.25s ease;
    `;

    modal.innerHTML = `
        <style>
            @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
            @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        </style>

        <!-- Backdrop -->
        <div id="articleModalBackdrop" style="
            position:absolute; inset:0;
            background:rgba(0,0,0,0.85);
            backdrop-filter:blur(12px);
        "></div>

        <!-- Modal box -->
        <div style="
            position:relative; z-index:1;
            width:70vw; max-width:1000px; max-height:85vh;
            background:#0d0d0d;
            border:1px solid rgba(255,255,255,0.08);
            border-radius:1.2vw;
            overflow:hidden;
            animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
            display:flex; flex-direction:column;
        ">
            <!-- HERO: image left + title right -->
            <div style="display:flex;flex-direction:row;height:28vw;max-height:320px;flex-shrink:0;">

                <!-- Image -->
                <div style="width:45%;flex-shrink:0;overflow:hidden;">
                    <img src="${article.image}" alt="${article.title}"
                        style="width:100%;height:100%;object-fit:cover;display:block;"
                        onerror="this.style.background='${fallbackGradient(article.category)}';this.style.display='block';this.src='';">
                </div>

                <!-- Title block -->
                <div style="
                    flex:1; padding:2.5vw 2.5vw 2vw;
                    display:flex; flex-direction:column; justify-content:flex-end;
                    background:linear-gradient(135deg,#111 0%,#0a0a0a 100%);
                ">
                    <span style="
                        font-size:0.8vw; font-weight:700; letter-spacing:0.12em;
                        text-transform:uppercase; color:${color}; margin-bottom:1vw;
                    ">${article.categoryLabel}</span>
                    <h2 style="
                        font-family:'Playfair Display',serif;
                        font-size:clamp(1.2rem,2.2vw,2.4rem);
                        font-weight:900; color:white; line-height:1.2; margin:0 0 1.2vw;
                    ">${article.title}</h2>
                    <div style="display:flex;align-items:center;gap:1.2vw;font-size:0.8vw;color:rgba(255,255,255,0.4);">
                        <span>✍️ ${article.author || 'Editorial'}</span>
                        <span>·</span>
                        <span>📅 ${article.date}</span>
                    </div>
                </div>
            </div>

            <!-- ARTICLE BODY -->
            <div style="
                flex:1; overflow-y:auto; padding:2.5vw 3vw 3vw;
                scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.1) transparent;
            ">
                ${article.article.map(paragraph => `
                    <p style="
                        color:rgba(255,255,255,0.75);
                        font-size:clamp(0.8rem,1vw,1.05rem);
                        line-height:1.85; margin:0 0 1.4vw;
                    ">${paragraph}</p>
                `).join('')}
            </div>

            <!-- CLOSE BUTTON -->
            <button id="articleModalClose" style="
                position:absolute; top:1.2vw; right:1.2vw;
                width:2.4vw; height:2.4vw; min-width:32px; min-height:32px;
                border-radius:50%;
                background:rgba(255,255,255,0.08);
                border:1px solid rgba(255,255,255,0.15);
                color:rgba(255,255,255,0.7); cursor:pointer;
                display:flex; align-items:center; justify-content:center;
                transition:background 0.2s,color 0.2s; z-index:2;
            "
            onmouseover="this.style.background='rgba(255,255,255,0.18)';this.style.color='white'"
            onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.color='rgba(255,255,255,0.7)'">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('articleModalBackdrop').addEventListener('click', closeArticleModal);
    document.getElementById('articleModalClose').addEventListener('click', closeArticleModal);
    document._newsEscHandler = (e) => { if (e.key === 'Escape') closeArticleModal(); };
    document.addEventListener('keydown', document._newsEscHandler);
}

function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    if (modal) modal.remove();
    document.removeEventListener('keydown', document._newsEscHandler);
}

// ==================== FILTERING ====================

// Filter the feed to show only articles matching the selected category
function applyFilter(category, label) {
    if (activeFilter === category) return; // Don't re-apply the same filter
    activeFilter = category;
    const filtered = allArticles.filter(a => a.category === category); // Filter in-memory, no re-fetch
    showFilterBadge(label, category);
    renderNews(filtered);
}

// Reset the filter and show all articles again
function clearFilter() {
    activeFilter = null;
    removeFilterBadge(); // Remove the visual badge showing the active filter
    renderNews(allArticles); // Re-render the full article list
}

// ==================== FILTER BADGE ====================

function showFilterBadge(label, category) {
    removeFilterBadge();

    const colors = {
        album:     '#667eea',
        interview: '#10d164',
        festival:  '#f093fb',
        divers:    '#f093fb',
    };
    const color = colors[category] || 'rgba(230,201,19,0.8)';

    const badge = document.createElement('div');
    badge.id = 'activeFilterBadge';
    badge.style.cssText = `
        position:absolute; top:1.5vw; left:50%; transform:translateX(-50%);
        display:flex; align-items:center; gap:0.6vw;
        padding:0.5vw 1.2vw 0.5vw 1.4vw;
        background:rgba(0,0,0,0.7); backdrop-filter:blur(12px);
        border:1px solid ${color}; border-radius:3vw;
        color:${color}; font-size:0.9vw; font-weight:600;
        z-index:60; animation:filterBadgeIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
        white-space:nowrap;
    `;
    badge.innerHTML = `
        <span>${label}</span>
        <button onclick="clearFilter()" style="
            background:none;border:none;color:${color};cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            padding:0.1vw;margin-left:0.2vw;opacity:0.7;
            transition:opacity 0.2s,transform 0.2s;font-size:1.1vw;line-height:1;
        "
        onmouseover="this.style.opacity='1';this.style.transform='scale(1.2)'"
        onmouseout="this.style.opacity='0.7';this.style.transform='scale(1)'"
        aria-label="Remove filter">✕</button>
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

// ==================== ERROR STATE ====================

function renderError() {
    const newsStack = document.getElementById('newsStack');
    newsStack.innerHTML = `
        <div style="
            display:flex; flex-direction:column; align-items:center;
            justify-content:center; height:70vh; gap:1.5vw; text-align:center;
        ">
            <span style="font-size:3vw;">📡</span>
            <p style="color:rgba(255,255,255,0.6);font-size:1.2vw;">Could not load the news feed.</p>
            <p style="color:rgba(255,255,255,0.3);font-size:0.9vw;">Check your connection or try again later.</p>
            <button onclick="fetchNews()" style="
                margin-top:1vw; padding:0.8vw 2vw;
                background:rgba(230,201,19,0.1); border:1px solid rgba(230,201,19,0.4);
                color:rgb(230,201,19); border-radius:3vw;
                cursor:pointer; font-size:1vw; font-family:inherit;
            ">Retry</button>
        </div>
    `;
}

// ==================== FALLBACK COLORS ====================

function fallbackGradient(category) {
    const gradients = {
        album:     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        interview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        festival:  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        divers:    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    };
    return gradients[category] || 'linear-gradient(135deg, #333 0%, #111 100%)';
}

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

// Re-attach the scroll handler each time the news feed is re-rendered
// removeEventListener first to avoid duplicate handlers after filtering
function attachScrollHandler() {
    const newsStack = document.getElementById('newsStack');
    if (!newsStack) return;
    newsStack.removeEventListener('wheel', handleNewsScroll); // Remove old handler if exists
    newsStack.addEventListener('wheel', handleNewsScroll, { passive: false }); // passive:false allows preventDefault()
}

function handleNewsScroll(e) {
    if (isScrolling) return;

    const cards      = document.querySelectorAll('.news-stack-card');
    const totalCards = cards.length;

    // Scrolling down → show next card
    if (e.deltaY > 0 && currentCardIndex < totalCards - 1) {
        e.preventDefault(); // Stop the page from scrolling normally
        isScrolling = true;
        currentCardIndex++;
        updateCardPositions();
        setTimeout(() => isScrolling = false, 600); // Re-enable scrolling after transition completes

    // Scrolling up → show previous card
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
        card.classList.toggle('scrolled-up', relativeIndex < 0); // Cards above current get a "scrolled-up" class
        card.setAttribute('data-index', relativeIndex); // CSS uses data-index to position cards in the stack
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