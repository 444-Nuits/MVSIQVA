// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    
    // PLAYLIST - Ajoutez vos musiques ici !
    const playlist = [
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
            title: "CA VA ENSEMBLE (remix)",
            artist: "Alpa Wann x Nujabes",
            file: "media/music/ÇA VA ENSEMBLE - Alpha Wann x Nujabes (remix).mp3",
            cover: "media/cover/UMLA.jpg"
        },

        // Ajoutez vos autres musiques ici en suivant le même format :
        // {
        //     title: "Nom de la chanson",
        //     artist: "Nom de l'artiste",
        //     file: "media/music/votre-fichier.mp3",
        //     cover: "media/cover2.jpg"
        // },
    ];

    let currentTrackIndex = 0;

    // Récupération des éléments
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

    // Variable pour savoir si la musique joue
    let isPlaying = false;

    // Fonction pour charger une musique
    function loadTrack(index) {
        const track = playlist[index];
        
        // Mettre à jour la source audio
        audio.src = track.file;
        
        // Mettre à jour les infos
        trackTitle.textContent = track.title;
        trackArtist.textContent = track.artist;
        albumCover.src = track.cover;
        
        // Réinitialiser la progression
        progressFill.style.width = '0%';
        progressSlider.value = 0;
        timeCurrent.textContent = '0:00';
        
        // Charger les métadonnées
        audio.load();
    }

    // Fonction pour formater le temps (secondes -> mm:ss)
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Play / Pause
    playPauseBtn.addEventListener('click', function() {
        if (isPlaying) {
            audio.pause();
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        } else {
            audio.play();
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }
        isPlaying = !isPlaying;
    });

    // Bouton précédent - Musique précédente
    prevBtn.addEventListener('click', function() {
        if (audio.currentTime > 3) {
            // Si on est à plus de 3 secondes, on recommence la chanson
            audio.currentTime = 0;
        } else {
            // Sinon on passe à la chanson précédente
            currentTrackIndex--;
            if (currentTrackIndex < 0) {
                currentTrackIndex = playlist.length - 1; // Retour à la dernière chanson
            }
            loadTrack(currentTrackIndex);
            if (isPlaying) {
                audio.play();
            }
        }
    });

    // Bouton suivant - Musique suivante
    nextBtn.addEventListener('click', function() {
        currentTrackIndex++;
        if (currentTrackIndex >= playlist.length) {
            currentTrackIndex = 0; // Retour à la première chanson
        }
        loadTrack(currentTrackIndex);
        if (isPlaying) {
            audio.play();
        }
    });

    // Mise à jour de la barre de progression
    audio.addEventListener('timeupdate', function() {
        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = progress + '%';
            progressSlider.value = progress;
            timeCurrent.textContent = formatTime(audio.currentTime);
        }
    });

    // Afficher la durée totale quand les métadonnées sont chargées
    audio.addEventListener('loadedmetadata', function() {
        timeTotal.textContent = formatTime(audio.duration);
        progressSlider.max = 100;
    });

    // Permettre de déplacer la barre de progression
    progressSlider.addEventListener('input', function() {
        const time = (progressSlider.value / 100) * audio.duration;
        audio.currentTime = time;
        progressFill.style.width = progressSlider.value + '%';
    });

    // Quand la chanson se termine, passer à la suivante
    audio.addEventListener('ended', function() {
        currentTrackIndex++;
        if (currentTrackIndex >= playlist.length) {
            // Si c'est la dernière chanson, arrêter
            currentTrackIndex = 0;
            loadTrack(currentTrackIndex);
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            isPlaying = false;
        } else {
            // Sinon passer à la suivante
            loadTrack(currentTrackIndex);
            audio.play();
        }
    });

    // Permettre de cliquer directement sur la barre de progression
    const progressBar = document.querySelector('.progress-bar');
    progressBar.addEventListener('click', function(e) {
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = (clickX / width) * 100;
        
        progressSlider.value = percentage;
        const time = (percentage / 100) * audio.duration;
        audio.currentTime = time;
        progressFill.style.width = percentage + '%';
    });

    // Charger la première musique au démarrage
    loadTrack(currentTrackIndex);

});
