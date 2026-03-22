// ============================================================
// NEWS.JS — Système de cards stack + timeline
// ============================================================

let currentCardIndex = 0;
let isScrolling      = false;

function initNewsPage() {
    const newsStack    = document.getElementById('newsStack');
    const timelineDates = document.getElementById('timelineDates');
    if (!newsStack || !timelineDates) return;

    const cards = document.querySelectorAll('.news-stack-card');

    // Réinitialiser la timeline
    timelineDates.innerHTML = '';

    // Générer les dates dynamiquement depuis les cards HTML
    cards.forEach((card, index) => {
        const dateText = card.getAttribute('data-date');
        const dateItem = document.createElement('div');
        dateItem.className = 'timeline-date-item';
        if (index === 0) dateItem.classList.add('active');
        dateItem.innerHTML = `<div class="timeline-date-text">${dateText}</div>`;
        dateItem.addEventListener('click', () => jumpToCard(index));
        timelineDates.appendChild(dateItem);
    });

    // Réinitialiser l'index au début
    currentCardIndex = 0;

    // Scroll handler (on enlève l'ancien avant d'en rajouter un)
    newsStack.removeEventListener('wheel', handleNewsScroll);
    newsStack.addEventListener('wheel', handleNewsScroll, { passive: false });
}

function handleNewsScroll(e) {
    if (isScrolling) return;

    const cards      = document.querySelectorAll('.news-stack-card');
    const totalCards = cards.length;

    if (e.deltaY > 0 && currentCardIndex < totalCards - 1) {
        // Scroll vers le bas → card suivante
        e.preventDefault();
        isScrolling = true;
        currentCardIndex++;
        updateCardPositions();
        setTimeout(() => isScrolling = false, 600);

    } else if (e.deltaY < 0 && currentCardIndex > 0) {
        // Scroll vers le haut → card précédente
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
