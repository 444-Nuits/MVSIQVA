// ============================================================
// PLAYER.JS — Lecteur musical + Routeur de navigation centralisé
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ==================== PLAYLIST ====================

    const playlist = [
        { title: "Sundance", artist: "Népal", file: "media/music/Népal - Sundance.mp3", cover: "media/cover/AdiosBahamas.jpg" },
        { title: "INCENDIE", artist: "Wallace Cleaver", file: "media/music/INCENDIE - Wallace Cleaver.mp3", cover: "media/cover/INCENDIE.jpg" },
        { title: "BARA", artist: "Yvnnis", file: "media/music/Yvnnis - BARA.mp3", cover: "media/cover/DND.jpg" },
        { title: "GIVE ME LA PRISE CONNECTÉE (remix)", artist: "Freeze Corleone", file: "media/music/givemelaprisecorleone.mp3", cover: "media/cover/GiveMe.jpg" },
        { title: "ÇA VA ENSEMBLE (remix)", artist: "Alpa Wann, Nujabes", file: "media/music/ÇA VA ENSEMBLE - Alpha Wann x Nujabes (remix).mp3", cover: "media/cover/UMLA.jpg" },
        { title: "Mr Ledger 2", artist: "FEMTOGO", file: "media/music/FEMTOGO - MrLedger2.mp3", cover: "media/cover/BabyHayabusa.jpg" },
        { title: "En boucle", artist: "Adèle Castillon, Zamdane", file: "media/music/En boucle - Adèle Castillon, Zamdane.mp3", cover: "media/cover/EnBoucle.jpg" },
        { title: "PEUR DE LA MORT (remix)", artist: "BU$HI, Veridis Project", file: "media/music/Bushi - Peur de la mort.mp3", cover: "media/cover/Peurdelamort.png" },
        { title: "Babydoll", artist: "Dominic Flike", file: "media/music/Flike - Babydoll.mp3", cover: "media/cover/Flike.jpg" },
    ];

    let currentTrackIndex = 0;
    let isPlaying  = false;
    let currentPage = 'home';

    // ==================== ÉLÉMENTS DOM ====================

    const audio          = document.getElementById('audioPlayer');
    const playPauseBtn   = document.getElementById('playPauseBtn');
    const prevBtn        = document.getElementById('prevBtn');
    const nextBtn        = document.getElementById('nextBtn');
    const progressSlider = document.getElementById('progressSlider');
    const progressFill   = document.getElementById('progressFill');
    const progressBar    = document.querySelector('.progress-bar');
    const timeCurrent    = document.querySelector('.time-current');
    const timeTotal      = document.querySelector('.time-total');
    const playIcon       = document.getElementById('playIcon');
    const pauseIcon      = document.getElementById('pauseIcon');
    const trackTitle     = document.querySelector('.track-title');
    const trackArtist    = document.querySelector('.track-artist');
    const albumCover     = document.getElementById('albumCover');
    const musicPlayer    = document.getElementById('musicPlayer');
    const logoLink       = document.getElementById('logoLink');
    const navLinks       = document.querySelectorAll('.nav-link');
    const nav            = document.querySelector('nav');
    const indicator      = document.querySelector('.nav-indicator');

    // ============================================================
    // ROUTEUR CENTRALISÉ — window.navigateTo(pageName)
    //
    // Principe : on ferme TOUTES les pages d'un coup grâce à la
    // classe commune ".page", puis on ouvre uniquement la cible.
    // Aucun fichier JS n'a besoin de connaître les autres pages.
    // ============================================================

    window.navigateTo = function (pageName) {
        if (currentPage === pageName) return;
        currentPage = pageName;

        // 1. Fermer toutes les pages sans exception
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        // 2. Ouvrir la bonne page
        if (pageName === 'home') {
            document.body.classList.remove('page-open');
            const homePage = document.getElementById('homePage');
            if (homePage) homePage.classList.add('active');
        } else {
            document.body.classList.add('page-open');
            const target = document.getElementById(pageName + 'Page');
            if (target) target.classList.add('active');

            // Callback spécial pour la page News (initialisation du feed)
            if (pageName === 'news') setTimeout(() => initNewsPage(), 100);
        }

        // 3. Mettre à jour la navbar
        updateNavbar(pageName);
    };

    // Met à jour l'indicateur et les classes actives de la navbar
    function updateNavbar(pageName) {
        navLinks.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.nav-link[href="#${pageName}"]`);
        if (link) {
            link.classList.add('active');
            moveIndicatorTo(link);
        } else {
            // Pages sans lien navbar (home, profile) → cacher l'indicateur
            indicator.style.opacity = '0';
        }
    }

    function moveIndicatorTo(linkEl) {
        const rect    = linkEl.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        indicator.style.left    = (rect.left - navRect.left) + 'px';
        indicator.style.width   = rect.width + 'px';
        indicator.style.opacity = '1';
    }

    window.addEventListener('resize', () => {
        const activeLink = document.querySelector('nav ul li a.active');
        if (activeLink) moveIndicatorTo(activeLink);
    });

    // Exposé pour que les autres fichiers puissent lire/écrire currentPage
    window.setCurrentPage = function (name) { currentPage = name; };

    // ==================== NAVBAR — CLICS ====================

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);

            // Search et Social ont leurs propres callbacks d'initialisation
            // → on les délègue à leurs fichiers JS respectifs
            if (target === 'search') {
                if (typeof window.openSearchPage === 'function') window.openSearchPage();
            } else if (target === 'social') {
                if (typeof window.openSocialPage === 'function') window.openSocialPage();
            } else {
                window.navigateTo(target);
            }
        });
    });

    // Logo → retour accueil
    logoLink.addEventListener('click', function (e) {
        e.preventDefault();
        musicPlayer.classList.remove('expanded');
        currentPage = '__force__'; // Contourner la garde "même page"
        window.navigateTo('home');
    });

    // ==================== FONCTIONS LECTEUR ====================

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function loadTrack(index) {
        const track = playlist[index];
        audio.src                = track.file;
        trackTitle.textContent   = track.title;
        trackArtist.textContent  = track.artist;
        albumCover.src           = track.cover;
        progressFill.style.width = '0%';
        progressSlider.value     = 0;
        timeCurrent.textContent  = '0:00';
        audio.load();
    }

    // Play / Pause
    playPauseBtn.addEventListener('click', function () {
        if (isPlaying) {
            audio.pause();
            playIcon.style.display  = 'block';
            pauseIcon.style.display = 'none';
            musicPlayer.classList.remove('playing');
        } else {
            audio.play();
            playIcon.style.display  = 'none';
            pauseIcon.style.display = 'block';
            musicPlayer.classList.add('playing');
        }
        isPlaying = !isPlaying;
    });

    // Bouton précédent
    prevBtn.addEventListener('click', function () {
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
        } else {
            currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
            loadTrack(currentTrackIndex);
            if (isPlaying) audio.play();
        }
    });

    // Bouton suivant
    nextBtn.addEventListener('click', function () {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) audio.play();
    });

    // Progression en temps réel
    audio.addEventListener('timeupdate', function () {
        if (!audio.duration) return;
        const progress           = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = progress + '%';
        progressSlider.value     = progress;
        timeCurrent.textContent  = formatTime(audio.currentTime);
    });

    // Durée totale
    audio.addEventListener('loadedmetadata', function () {
        timeTotal.textContent = formatTime(audio.duration);
        progressSlider.max    = 100;
    });

    // Slider de progression
    progressSlider.addEventListener('input', function () {
        audio.currentTime        = (progressSlider.value / 100) * audio.duration;
        progressFill.style.width = progressSlider.value + '%';
    });

    // Clic sur la barre de progression
    progressBar.addEventListener('click', function (e) {
        const rect               = progressBar.getBoundingClientRect();
        const percentage         = ((e.clientX - rect.left) / rect.width) * 100;
        progressSlider.value     = percentage;
        audio.currentTime        = (percentage / 100) * audio.duration;
        progressFill.style.width = percentage + '%';
    });

    // Fin de piste → suivant automatique
    audio.addEventListener('ended', function () {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(currentTrackIndex);
        if (currentTrackIndex === 0) {
            playIcon.style.display  = 'block';
            pauseIcon.style.display = 'none';
            isPlaying = false;
            musicPlayer.classList.remove('playing');
        } else {
            audio.play();
            musicPlayer.classList.add('playing');
        }
    });

    // ==================== EXPANSION PLAYER ====================

    musicPlayer.addEventListener('click', function (e) {
        if (!document.body.classList.contains('page-open')) return;
        if (e.target.closest('.control-btn') || e.target.closest('.progress-slider')) return;
        this.classList.toggle('expanded');
    });

    // ==================== INIT ====================
    loadTrack(currentTrackIndex);
});