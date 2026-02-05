// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function () {

    // ==================== PLAYLIST ====================
    const playlist = [
        {
            title: "Sundance",
            artist: "Népal",
            file: "media/music/Népal - Sundance.mp3",
            cover: "media/cover/AdiosBahamas.jpg"
        },
        {
            title: "INCENDIE",
            artist: "Wallace Cleaver",
            file: "media/music/INCENDIE - Wallace Cleaver.mp3",
            cover: "media/cover/INCENDIE.jpg"
        },
        {
            title: "BARA",
            artist: "Yvnnis",
            file: "media/music/Yvnnis - BARA.mp3",
            cover: "media/cover/DND.jpg"
        },
        {
            title: "GIVE ME LA PRISE CONNECTÉE (remix)",
            artist: "Freeze Corleone",
            file: "media/music/GIVE ME LA PRISE CONNECTÉE - Freeze Corleone (remix).mp3",
            cover: "media/cover/GiveMe.jpg"
        },
        {
            title: "ÇA VA ENSEMBLE (remix)",
            artist: "Alpa Wann x Nujabes",
            file: "media/music/ÇA VA ENSEMBLE - Alpha Wann x Nujabes (remix).mp3",
            cover: "media/cover/UMLA.jpg"
        },
    ];

    let currentTrackIndex = 0;

    // ==================== ÉLÉMENTS DOM ====================
    // Music Player
    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressSlider = document.getElementById('progressSlider');
    const progressFill = document.getElementById('progressFill');
    const timeCurrent = document.querySelector('.time-current');
    const timeTotal = document.querySelector('.time-total');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const trackTitle = document.querySelector('.track-title');
    const trackArtist = document.querySelector('.track-artist');
    const albumCover = document.getElementById('albumCover');

    // Navigation
    const logoLink = document.getElementById('logoLink');
    const navLinks = document.querySelectorAll('.nav-link');
    const homePage = document.getElementById('homePage');
    const worldPage = document.getElementById('worldPage');

    let isPlaying = false;
    let currentPage = 'home'; // 'home' ou 'world'




    // ==================== MOVING SLIDER ON CLICK - NAV ====================

    const nav = document.querySelector('nav');
const indicator = document.querySelector('.nav-indicator');

/* déplace l'indicateur sous le lien actif */
function moveIndicatorToActive() {
    const activeLink = document.querySelector('nav ul li a.active');
    if (!activeLink) return;

    const rect = activeLink.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();

    indicator.style.left = (rect.left - navRect.left) + 'px';
    indicator.style.width = rect.width + 'px';
    indicator.style.opacity = '1';
}

/* clic sur un lien */
navLinks.forEach(link => {
    link.addEventListener('click', function () {

        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        moveIndicatorToActive();
    });
});

/* resize = recalcul */
window.addEventListener('resize', moveIndicatorToActive);

/* reset quand on revient à home */
logoLink.addEventListener('click', () => {
    navLinks.forEach(l => l.classList.remove('active'));
    indicator.style.opacity = '0';
});



    // ==================== FONCTIONS MUSIC PLAYER ====================

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

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Play / Pause
    playPauseBtn.addEventListener('click', function () {
        if (isPlaying) {
            audio.pause();
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            document.querySelector('.music-player').classList.remove('playing');
        } else {
            audio.play();
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            document.querySelector('.music-player').classList.add('playing');
        }
        isPlaying = !isPlaying;
    });

    // Bouton précédent
    prevBtn.addEventListener('click', function () {
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
        } else {
            currentTrackIndex--;
            if (currentTrackIndex < 0) {
                currentTrackIndex = playlist.length - 1;
            }
            loadTrack(currentTrackIndex);
            if (isPlaying) {
                audio.play();
            }
        }
    });

    // Bouton suivant
    nextBtn.addEventListener('click', function () {
        currentTrackIndex++;
        if (currentTrackIndex >= playlist.length) {
            currentTrackIndex = 0;
        }
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            audio.play();
        }
    });

    // Mise à jour de la barre de progression
    audio.addEventListener('timeupdate', function () {
        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = progress + '%';
            progressSlider.value = progress;
            timeCurrent.textContent = formatTime(audio.currentTime);
        }
    });

    // Afficher la durée totale
    audio.addEventListener('loadedmetadata', function () {
        timeTotal.textContent = formatTime(audio.duration);
        progressSlider.max = 100;
    });

    // Déplacer la barre de progression
    progressSlider.addEventListener('input', function () {
        const time = (progressSlider.value / 100) * audio.duration;
        audio.currentTime = time;
        progressFill.style.width = progressSlider.value + '%';
    });


    // Quand la chanson se termine
    audio.addEventListener('ended', function () {
        currentTrackIndex++;
        if (currentTrackIndex >= playlist.length) {
            currentTrackIndex = 0;
            loadTrack(currentTrackIndex);
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            isPlaying = false;
            document.querySelector('.music-player').classList.remove('playing');
        } else {
            loadTrack(currentTrackIndex);
            audio.play();
            document.querySelector('.music-player').classList.add('playing');
        }
    });

    // Cliquer sur la barre de progression
    const progressBar = document.querySelector('.progress-bar');
    progressBar.addEventListener('click', function (e) {
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = (clickX / width) * 100;

        progressSlider.value = percentage;
        const time = (percentage / 100) * audio.duration;
        audio.currentTime = time;
        progressFill.style.width = percentage + '%';
    });

    // ==================== NAVIGATION ENTRE PAGES ====================

    function openPage(pageName) {
        if (currentPage === pageName) return; // Déjà sur cette page

        currentPage = pageName;

        if (pageName === 'world') {
            // Ajouter la classe pour repositionner le player et la navbar
            document.body.classList.add('page-open');

            // Activer la page World (slide up)
            worldPage.classList.add('active');

        } else if (pageName === 'home') {
            // Retirer la classe
            document.body.classList.remove('page-open');

            // Désactiver la page World (slide down)
            worldPage.classList.remove('active');
        }
    }

    // Clic sur les liens de navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1); // Enlever le #

            if (target === 'world') {
                openPage('world');
            }
            // Pour l'instant, seule la page World est implémentée
            // Les autres pages pourront être ajoutées plus tard
        });
    });

    // Clic sur le logo pour retourner à l'accueil
    logoLink.addEventListener('click', function (e) {
        e.preventDefault();
        openPage('home');
    });

    // ==================== GESTION EXPANSION PLAYER ====================

const musicPlayer = document.getElementById('musicPlayer');

musicPlayer.addEventListener('click', function(e) {
    // On ne veut agrandir/réduire que si on est sur une page secondaire (page-open)
    if (!document.body.classList.contains('page-open')) return;

    // Empêcher la fermeture si on clique sur les boutons de contrôle ou le slider
    if (e.target.closest('.control-btn') || e.target.closest('.progress-slider')) {
        return; 
    }

    // Alterne la classe expanded
    this.classList.toggle('expanded');
});

// Optionnel : Refermer le player quand on revient à l'accueil
logoLink.addEventListener('click', () => {
    musicPlayer.classList.remove('expanded');
});

    // ==================== INITIALISATION ====================
    loadTrack(currentTrackIndex);
});
