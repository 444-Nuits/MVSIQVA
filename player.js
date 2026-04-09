// ============================================================
// PLAYER.JS — Lecteur musical + Navigation entre pages
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ==================== PLAYLIST ====================

    const playlist = [
        { title: "Sundance", artist: "Népal", file: "media/music/Népal - Sundance.mp3", cover: "media/cover/AdiosBahamas.jpg" },
        { title: "INCENDIE", artist: "Wallace Cleaver", file: "media/music/INCENDIE - Wallace Cleaver.mp3", cover: "media/cover/INCENDIE.jpg" },
        { title: "BARA", artist: "Yvnnis", file: "media/music/Yvnnis - BARA.mp3", cover: "media/cover/DND.jpg" },
        { title: "GIVE ME LA PRISE CONNECTÉE (remix)", artist: "Freeze Corleone", file: "media/music/GIVE ME LA PRISE CONNECTÉE - Freeze Corleone (remix).mp3", cover: "media/cover/GiveMe.jpg" },
        { title: "ÇA VA ENSEMBLE (remix)", artist: "Alpa Wann, Nujabes", file: "media/music/ÇA VA ENSEMBLE - Alpha Wann x Nujabes (remix).mp3", cover: "media/cover/UMLA.jpg" },
        { title: "Mr Ledger 2", artist: "FEMTOGO", file: "media/music/FEMTOGO - MrLedger2.mp3", cover: "media/cover/BabyHayabusa.jpg" },
        { title: "En boucle", artist: "Adèle Castillon, Zamdane", file: "media/music/En boucle - Adèle Castillon, Zamdane.mp3", cover: "media/cover/EnBoucle.jpg" },
        { title: "PEUR DE LA MORT (remix)", artist: "BU$HI, Veridis Project", file: "media/music/Bushi - Peur de la mort.mp3", cover: "media/cover/Peurdelamort.png" },
        { title: "Babydoll", artist: "Dominic Flike", file: "media/music/Flike - Babydoll.mp3", cover: "media/cover/Flike.jpg" },
    ];

    let currentTrackIndex = 0;
    let isPlaying = false;
    let currentPage = 'home';

    // ==================== ÉLÉMENTS DOM ====================

    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressSlider = document.getElementById('progressSlider');
    const progressFill = document.getElementById('progressFill');
    const progressBar = document.querySelector('.progress-bar');
    const timeCurrent = document.querySelector('.time-current');
    const timeTotal = document.querySelector('.time-total');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const trackTitle = document.querySelector('.track-title');
    const trackArtist = document.querySelector('.track-artist');
    const albumCover = document.getElementById('albumCover');
    const musicPlayer = document.getElementById('musicPlayer');

    const logoLink = document.getElementById('logoLink');
    const navLinks = document.querySelectorAll('.nav-link');
    const worldPage = document.getElementById('worldPage');
    const newsPage = document.getElementById('newsPage');

    // ==================== NAVBAR INDICATOR ====================

    const nav = document.querySelector('nav');
    const indicator = document.querySelector('.nav-indicator');

    function moveIndicatorToActive() {
        const activeLink = document.querySelector('nav ul li a.active');
        if (!activeLink) return;
        const rect = activeLink.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        indicator.style.left = (rect.left - navRect.left) + 'px';
        indicator.style.width = rect.width + 'px';
        indicator.style.opacity = '1';
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            moveIndicatorToActive();
        });
    });

    window.addEventListener('resize', moveIndicatorToActive);

    

    // ==================== FONCTIONS LECTEUR ====================

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function loadTrack(index) {
        const track = playlist[index];
        audio.src = track.file;
        trackTitle.textContent = track.title;
        trackArtist.textContent = track.artist;
        albumCover.src = track.cover;
        progressFill.style.width = '0%';
        progressSlider.value = 0;
        timeCurrent.textContent = '0:00';
        audio.load();
    }

    // Play / Pause
    playPauseBtn.addEventListener('click', function () {
        if (isPlaying) {
            audio.pause();
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            musicPlayer.classList.remove('playing');
        } else {
            audio.play();
            playIcon.style.display = 'none';
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
        const progress = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = progress + '%';
        progressSlider.value = progress;
        timeCurrent.textContent = formatTime(audio.currentTime);
    });

    // Durée totale
    audio.addEventListener('loadedmetadata', function () {
        timeTotal.textContent = formatTime(audio.duration);
        progressSlider.max = 100;
    });

    // Slider de progression
    progressSlider.addEventListener('input', function () {
        const time = (progressSlider.value / 100) * audio.duration;
        audio.currentTime = time;
        progressFill.style.width = progressSlider.value + '%';
    });

    // Clic sur la barre de progression
    progressBar.addEventListener('click', function (e) {
        const rect = progressBar.getBoundingClientRect();
        const percentage = ((e.clientX - rect.left) / rect.width) * 100;
        progressSlider.value = percentage;
        audio.currentTime = (percentage / 100) * audio.duration;
        progressFill.style.width = percentage + '%';
    });

    // Fin de piste
    audio.addEventListener('ended', function () {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(currentTrackIndex);
        if (currentTrackIndex === 0) {
            playIcon.style.display = 'block';
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

    logoLink.addEventListener('click', function (e) {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        indicator.style.opacity = '0';
        musicPlayer.classList.remove('expanded');
        // Forcer currentPage à une valeur différente de 'home'
        // pour que openPage('home') ne soit pas court-circuité
        currentPage = '__force__';
        openPage('home');
    });

    // ==================== NAVIGATION ENTRE PAGES ====================

    function openPage(pageName) {
    if (currentPage === pageName) return;
    currentPage = pageName;

    // Fermer toutes les pages d'abord
    worldPage.classList.remove('active');
    if (newsPage) newsPage.classList.remove('active');
    const profilePage = document.getElementById('profilePage');
    if (profilePage) profilePage.classList.remove('active');
    const aboutPage = document.getElementById('aboutPage');
    if (aboutPage) aboutPage.classList.remove('active');
    const searchPage = document.getElementById('searchPage');
    if (searchPage) searchPage.classList.remove('active');
    const socialPage = document.getElementById('socialPage');
if (socialPage) socialPage.classList.remove('active');

    if (pageName === 'world') {
        document.body.classList.add('page-open');
        worldPage.classList.add('active');

    } else if (pageName === 'news') {
        document.body.classList.add('page-open');
        if (newsPage) {
            newsPage.classList.add('active');
            setTimeout(() => initNewsPage(), 100);
        }

    } else if (pageName === 'about') {
        document.body.classList.add('page-open');
        if (aboutPage) aboutPage.classList.add('active');

    } else if (pageName === 'home') {
        document.body.classList.remove('page-open');
        currentPage = 'home';
    }
    else if (target === 'social') {
        if (typeof window.openSocialPage === 'function') window.openSocialPage();
    }
}

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            if (target === 'world') openPage('world');
            else if (target === 'news') openPage('news');
            else if (target === 'about') openPage('about');
            else if (target === 'search') {
                if (typeof window.openSearchPage === 'function') window.openSearchPage();
            }
        });
    });

    

    // ==================== EXPOSITION GLOBALE ====================
    // Permet à profile.js, about.js etc. d'appeler openPage et setCurrentPage
    window.openPage = openPage;
    window.setCurrentPage = function(name) { currentPage = name; };

    // ==================== INIT ====================
    loadTrack(currentTrackIndex);
});