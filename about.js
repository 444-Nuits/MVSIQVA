(function () {
    const aboutPage = document.getElementById('aboutPage');
    const aboutBg   = aboutPage ? aboutPage.querySelector('.about-bg') : null;

    // Observer les changements de classe sur aboutPage
    if (aboutPage && aboutBg) {
        const obs = new MutationObserver(() => {
            // La vidéo est dans la section, elle suit naturellement la visibilité
        });
        obs.observe(aboutPage, { attributes: true, attributeFilter: ['class'] });
    }
})();

// Liens footer → navigation
document.querySelectorAll('.about-footer-zone a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const target = this.getAttribute('href').substring(1);

        // Trouver le lien navbar correspondant et simuler un clic
        const navLink = document.querySelector(`.nav-link[href="#${target}"]`);

        if (target === 'about') {
            // Déjà sur About, ne rien faire
            return;
        }

        const indicator = document.querySelector('.nav-indicator');

        if (target === 'profile') {
            // Profile n'a pas de lien navbar → masquer l'indicateur
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            if (indicator) indicator.style.opacity = '0';
        } else if (navLink) {
            // Mettre à jour le slider navbar
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            navLink.classList.add('active');

            // Déplacer l'indicateur
            const nav = document.querySelector('nav');
            const rect = navLink.getBoundingClientRect();
            const navRect = nav.getBoundingClientRect();
            if (indicator) {
                indicator.style.left    = (rect.left - navRect.left) + 'px';
                indicator.style.width   = rect.width + 'px';
                indicator.style.opacity = '1';
            }
        }

     
        setTimeout(() => {
    if (target === 'world') {
        if (typeof window.openPage === 'function') window.openPage('world');
    } else if (target === 'news') {
        if (typeof window.openPage === 'function') window.openPage('news');
    } else if (target === 'home') {
        if (typeof window.openPage === 'function') window.openPage('home');
    } else if (target === 'profile') {
        if (typeof window.openProfilePage === 'function') window.openProfilePage();
    }
}, 50);
    });
});

// Newsletter
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