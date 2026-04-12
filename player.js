// ============================================================
// PLAYER.JS — Music player + Centralised navigation router
//
// This file has two responsibilities:
//   1. Control the persistent music player (play/pause, next, prev, progress bar)
//   2. Act as the central router for the entire app — all page navigation
//      goes through window.navigateTo() defined here
//
// ARCHITECTURE
// ┌─────────────────────────────────────────────────┐
// │  DATA LAYER     playlist[]                      │
// │                 → local audio files (media/)    │
// ├─────────────────────────────────────────────────┤
// │  LOGIC LAYER    navigateTo / loadTrack          │
// │                 → routing logic, audio state    │
// ├─────────────────────────────────────────────────┤
// │  UI LAYER       updateNavbar / moveIndicatorTo  │
// │                 → DOM manipulation only         │
// └─────────────────────────────────────────────────┘
// ============================================================

// Wait for the full HTML to be parsed before running any JS
document.addEventListener('DOMContentLoaded', function () {

    // ============================================================
    // DATA LAYER — Local playlist
    // Each entry has a title, artist, local audio file path, and cover image
    // ============================================================

    const playlist = [
        { title: "Sundance",                          artist: "Népal",                    file: "media/music/Népal - Sundance.mp3",                                    cover: "media/cover/AdiosBahamas.jpg" },
        { title: "INCENDIE",                          artist: "Wallace Cleaver",           file: "media/music/INCENDIE - Wallace Cleaver.mp3",                          cover: "media/cover/INCENDIE.jpg" },
        { title: "BARA",                              artist: "Yvnnis",                   file: "media/music/Yvnnis - BARA.mp3",                                       cover: "media/cover/DND.jpg" },
        { title: "GIVE ME LA PRISE CONNECTÉE (remix)",artist: "Freeze Corleone",          file: "media/music/givemelaprisecorleone.mp3",                               cover: "media/cover/GiveMe.jpg" },
        { title: "ÇA VA ENSEMBLE (remix)",            artist: "Alpa Wann, Nujabes",       file: "media/music/ÇA VA ENSEMBLE - Alpha Wann x Nujabes (remix).mp3",       cover: "media/cover/UMLA.jpg" },
        { title: "Mr Ledger 2",                       artist: "FEMTOGO",                  file: "media/music/FEMTOGO - MrLedger2.mp3",                                 cover: "media/cover/BabyHayabusa.jpg" },
        { title: "En boucle",                         artist: "Adèle Castillon, Zamdane", file: "media/music/En boucle - Adèle Castillon, Zamdane.mp3",                cover: "media/cover/EnBoucle.jpg" },
        { title: "PEUR DE LA MORT (remix)",           artist: "BU$HI, Veridis Project",   file: "media/music/Bushi - Peur de la mort.mp3",                             cover: "media/cover/Peurdelamort.png" },
        { title: "Babydoll",                          artist: "Dominic Flike",            file: "media/music/Flike - Babydoll.mp3",                                    cover: "media/cover/Flike.jpg" },
    ];

    let currentTrackIndex = 0;     // Index of the currently loaded track in the playlist
    let isPlaying         = false; // Whether audio is currently playing
    let currentPage       = 'home'; // Tracks the active page to prevent duplicate navigation

    // ============================================================
    // DOM REFERENCES — Cache all HTML elements we'll need to manipulate
    // Cached at startup for performance (avoids repeated querySelector calls)
    // ============================================================

    const audio          = document.getElementById('audioPlayer');     // The <audio> element
    const playPauseBtn   = document.getElementById('playPauseBtn');    // Play/pause button
    const prevBtn        = document.getElementById('prevBtn');          // Previous track button
    const nextBtn        = document.getElementById('nextBtn');          // Next track button
    const progressSlider = document.getElementById('progressSlider');  // Range input for seeking
    const progressFill   = document.getElementById('progressFill');    // Filled portion of progress bar
    const progressBar    = document.querySelector('.progress-bar');    // Clickable progress bar container
    const timeCurrent    = document.querySelector('.time-current');    // Current time display
    const timeTotal      = document.querySelector('.time-total');      // Total duration display
    const playIcon       = document.getElementById('playIcon');        // Play SVG icon
    const pauseIcon      = document.getElementById('pauseIcon');       // Pause SVG icon
    const trackTitle     = document.querySelector('.track-title');     // Track name text
    const trackArtist    = document.querySelector('.track-artist');    // Artist name text
    const albumCover     = document.getElementById('albumCover');      // Album cover image
    const musicPlayer    = document.getElementById('musicPlayer');     // The player bar element
    const logoLink       = document.getElementById('logoLink');        // Logo → navigates home
    const navLinks       = document.querySelectorAll('.nav-link');     // All navigation links
    const nav            = document.querySelector('nav');              // The nav element (for indicator positioning)
    const indicator      = document.querySelector('.nav-indicator');   // Animated underline indicator

    // ============================================================
    // LOGIC LAYER — Navigation router & audio state
    // ============================================================

    // ============================================================
    // CENTRALISED ROUTER — window.navigateTo(pageName)
    //
    // Principle: every page has the CSS class ".page". To switch pages,
    // we remove "active" from all of them, then add it to the target.
    // This means no JS file needs to know about any other page — they
    // all just call window.navigateTo('search') etc.
    // ============================================================

    window.navigateTo = function (pageName) {
        if (currentPage === pageName) return; // Don't re-navigate to the current page
        currentPage = pageName;

        // 1. Remove "active" from every page simultaneously
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        // 2. Show the correct page
        if (pageName === 'home') {
            // Home is a special case: it removes the "page-open" class
            // which controls whether the music player is visible or hidden
            document.body.classList.remove('page-open');
            const homePage = document.getElementById('homePage');
            if (homePage) homePage.classList.add('active');
        } else {
            document.body.classList.add('page-open'); // Show the music player bar
            const target = document.getElementById(pageName + 'Page'); // e.g. "searchPage"
            if (target) target.classList.add('active');

            // The News page needs its feed initialised on first open
            // setTimeout gives the page time to become visible before loading data
            if (pageName === 'news') setTimeout(() => initNewsPage(), 100);
        }

        // 3. Sync the navbar indicator with the new active page
        updateNavbar(pageName);
    };

    // ============================================================
    // UI LAYER — Visual updates for navbar & player
    // ============================================================

    // Move the animated underline indicator to the active nav link
    function updateNavbar(pageName) {
        navLinks.forEach(l => l.classList.remove('active')); // Reset all links
        const link = document.querySelector(`.nav-link[href="#${pageName}"]`);
        if (link) {
            link.classList.add('active');
            moveIndicatorTo(link); // Animate the indicator to this link
        } else {
            // Pages without a nav link (home, profile) → hide the indicator
            indicator.style.opacity = '0';
        }
    }

    // Calculate the position and width of a nav link and move the indicator there
    function moveIndicatorTo(linkEl) {
        const rect    = linkEl.getBoundingClientRect(); // Link's position on screen
        const navRect = nav.getBoundingClientRect();    // Nav bar's position on screen
        // Position indicator relative to the nav bar (not the viewport)
        indicator.style.left    = (rect.left - navRect.left) + 'px';
        indicator.style.width   = rect.width + 'px';
        indicator.style.opacity = '1';
    }

    // Recalculate indicator position when the window is resized
    window.addEventListener('resize', () => {
        const activeLink = document.querySelector('nav ul li a.active');
        if (activeLink) moveIndicatorTo(activeLink);
    });

    // Exposed so other JS files can force-update the tracked page name
    window.setCurrentPage = function (name) { currentPage = name; };

    // ==================== NAVBAR — CLICK HANDLERS ====================

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault(); // Stop the browser from following the href="#..."
            const target = this.getAttribute('href').substring(1); // e.g. "search"

            // Search and Social pages have custom open functions defined in their own files
            // We call those instead of navigateTo so they can run their initialisation logic
            if (target === 'search') {
                if (typeof window.openSearchPage === 'function') window.openSearchPage();
            } else if (target === 'social') {
                if (typeof window.openSocialPage === 'function') window.openSocialPage();
            } else {
                window.navigateTo(target); // All other pages use the standard router
            }
        });
    });

    // Clicking the logo always returns to the home page
    logoLink.addEventListener('click', function (e) {
        e.preventDefault();
        musicPlayer.classList.remove('expanded');
        currentPage = '__force__'; // Bypass the "same page" guard so home always loads
        window.navigateTo('home');
    });

    // ==================== AUDIO PLAYER LOGIC ====================

    // Convert a number of seconds into "m:ss" format (e.g. 214 → "3:34")
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`; // padStart ensures "3:04" not "3:4"
    }

    // Load a track from the playlist by index — updates all player UI elements
    function loadTrack(index) {
        const track = playlist[index];
        audio.src                = track.file;   // Set the audio source
        trackTitle.textContent   = track.title;
        trackArtist.textContent  = track.artist;
        albumCover.src           = track.cover;
        progressFill.style.width = '0%';         // Reset progress bar
        progressSlider.value     = 0;
        timeCurrent.textContent  = '0:00';
        audio.load(); // Reload the audio element with the new source
    }

    // Toggle between play and pause
    playPauseBtn.addEventListener('click', function () {
        if (isPlaying) {
            audio.pause();
            playIcon.style.display  = 'block'; // Show play icon
            pauseIcon.style.display = 'none';
            musicPlayer.classList.remove('playing');
        } else {
            audio.play();
            playIcon.style.display  = 'none';
            pauseIcon.style.display = 'block'; // Show pause icon
            musicPlayer.classList.add('playing');
        }
        isPlaying = !isPlaying; // Toggle the state flag
    });

    // Previous button: restart current track if past 3s, otherwise go to previous track
    prevBtn.addEventListener('click', function () {
        if (audio.currentTime > 3) {
            audio.currentTime = 0; // Restart the current track
        } else {
            // Modulo ensures wrapping: going back from track 0 goes to the last track
            currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
            loadTrack(currentTrackIndex);
            if (isPlaying) audio.play();
        }
    });

    // Next button: move to the next track (wraps around to the beginning)
    nextBtn.addEventListener('click', function () {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) audio.play();
    });

    // Update the progress bar and current time display as the audio plays
    audio.addEventListener('timeupdate', function () {
        if (!audio.duration) return; // Avoid division by zero before metadata loads
        const progress           = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = progress + '%';   // Fill the visual bar
        progressSlider.value     = progress;           // Sync the range input thumb
        timeCurrent.textContent  = formatTime(audio.currentTime);
    });

    // Once audio metadata is loaded, display the total track duration
    audio.addEventListener('loadedmetadata', function () {
        timeTotal.textContent = formatTime(audio.duration);
        progressSlider.max    = 100;
    });

    // Allow seeking by dragging the range input slider
    progressSlider.addEventListener('input', function () {
        audio.currentTime        = (progressSlider.value / 100) * audio.duration;
        progressFill.style.width = progressSlider.value + '%';
    });

    // Allow seeking by clicking anywhere on the progress bar
    progressBar.addEventListener('click', function (e) {
        const rect               = progressBar.getBoundingClientRect();
        const percentage         = ((e.clientX - rect.left) / rect.width) * 100; // Click position as %
        progressSlider.value     = percentage;
        audio.currentTime        = (percentage / 100) * audio.duration;
        progressFill.style.width = percentage + '%';
    });

    // When a track finishes, automatically advance to the next one
    audio.addEventListener('ended', function () {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(currentTrackIndex);
        if (currentTrackIndex === 0) {
            // Reached the end of the playlist — stop playback
            playIcon.style.display  = 'block';
            pauseIcon.style.display = 'none';
            isPlaying = false;
            musicPlayer.classList.remove('playing');
        } else {
            audio.play();
            musicPlayer.classList.add('playing');
        }
    });

    // ==================== PLAYER EXPANSION ====================

    // Clicking the player bar toggles an expanded view (only when a page is open)
    musicPlayer.addEventListener('click', function (e) {
        if (!document.body.classList.contains('page-open')) return; // Disabled on home page
        if (e.target.closest('.control-btn') || e.target.closest('.progress-slider')) return; // Don't expand when clicking controls
        this.classList.toggle('expanded');
    });

    // ==================== INITIALISATION ====================

    // Load the first track on startup (but don't auto-play — wait for user interaction)
    loadTrack(currentTrackIndex);
});