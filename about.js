(function () {
    const aboutPage = document.getElementById('aboutPage');
    const aboutBg   = aboutPage ? aboutPage.querySelector('.about-bg') : null;

    if (aboutPage && aboutBg) {
        const obs = new MutationObserver(() => {
            // La vidéo suit naturellement la visibilité de la section
        });
        obs.observe(aboutPage, { attributes: true, attributeFilter: ['class'] });
    }
})();

// ============================================================
// Liens footer → navigation via le routeur centralisé
// ============================================================

document.querySelectorAll('.about-footer-zone a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const target = this.getAttribute('href').substring(1);

        if (target === 'about') return; // Déjà sur About

        if (target === 'profile') {
            if (typeof window.openProfilePage === 'function') window.openProfilePage();
        } else if (target === 'search') {
            if (typeof window.openSearchPage === 'function') window.openSearchPage();
        } else if (target === 'social') {
            if (typeof window.openSocialPage === 'function') window.openSocialPage();
        } else {
            // world, news, home → routeur centralisé
            if (typeof window.navigateTo === 'function') window.navigateTo(target);
        }
    });
});

// ============================================================
// Newsletter
// ============================================================

document.getElementById('newsletterBtn').addEventListener('click', function () {
    const input = document.getElementById('newsletterEmail');
    const val   = input.value.trim();
    if (!val || !val.includes('@')) {
        input.style.borderColor = 'rgba(255,80,80,0.6)';
        setTimeout(() => input.style.borderColor = '', 2000);
        return;
    }
    input.value = '';
    input.style.borderColor = 'rgba(230,201,19,0.6)';
    setTimeout(() => input.style.borderColor = '', 2000);
    let toast = document.getElementById('globalToast');
    if (toast) {
        toast.textContent   = '✓ Inscription confirmée !';
        toast.style.opacity = '1';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }
});