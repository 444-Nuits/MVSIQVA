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
            artist: "Alpa Wann, Nujabes",
            file: "media/music/ÇA VA ENSEMBLE - Alpha Wann x Nujabes (remix).mp3",
            cover: "media/cover/UMLA.jpg"
        },
        {
            title: "Mr Ledger 2",
            artist: "FEMTOGO",
            file: "media/music/FEMTOGO - MrLedger2.mp3",
            cover: "media/cover/UMLA.jpg"
        },
        {
            title: "En boucle",
            artist: "Adèle Castillon, Zamdane",
            file: "media/music/En boucle - Adèle Castillon, Zamdane.mp3",
            cover: "media/cover/UMLA.jpg"
        },
        {
            title: "PEUR DE LA MORT (remix)",
            artist: "BU$HI, Veridis Project",
            file: "media/music/Bushi - Peur de la mort.mp3",
            cover: "media/cover/UMLA.jpg"
        }
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
    const newsPage = document.getElementById('newsPage');

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

            // Désactiver NEWS si active
            if (newsPage) newsPage.classList.remove('active');

            // Activer la page World (slide up)
            worldPage.classList.add('active');

        } else if (pageName === 'news') {
            // Ajouter la classe pour repositionner le player et la navbar
            document.body.classList.add('page-open');

            // Désactiver WORLD si active
            worldPage.classList.remove('active');

            // Activer la page News (slide up)
            if (newsPage) {
                newsPage.classList.add('active');
                // Initialiser le système de cards après l'animation
                setTimeout(() => {
                    initNewsPage();
                }, 100);
            }

        } else if (pageName === 'home') {
            // Retirer la classe
            document.body.classList.remove('page-open');

            // Désactiver toutes les pages
            worldPage.classList.remove('active');
            if (newsPage) newsPage.classList.remove('active');
        }
    }

    // Clic sur les liens de navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1); // Enlever le #

            if (target === 'world') {
                openPage('world');
            } else if (target === 'news') {
                openPage('news');
            }
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

// ==================== NEWS PAGE - CARD STACK SYSTEM ====================

let currentCardIndex = 0;
let isScrolling = false;

function initNewsPage() {
    const newsStack = document.getElementById('newsStack');
    const timelineDates = document.getElementById('timelineDates');
    
    if (!newsStack || !timelineDates) return;
    
    const cards = document.querySelectorAll('.news-stack-card');
    
    // Réinitialiser la timeline
    timelineDates.innerHTML = '';
    
    // Générer les dates de la timeline
    cards.forEach((card, index) => {
        const dateText = card.getAttribute('data-date');
        const dateItem = document.createElement('div');
        dateItem.className = 'timeline-date-item';
        if (index === 0) dateItem.classList.add('active');
        dateItem.innerHTML = `<div class="timeline-date-text">${dateText}</div>`;
        dateItem.addEventListener('click', () => jumpToCard(index));
        timelineDates.appendChild(dateItem);
    });
    
    // Réinitialiser l'index
    currentCardIndex = 0;
    
    // Scroll handler
    newsStack.removeEventListener('wheel', handleNewsScroll);
    newsStack.addEventListener('wheel', handleNewsScroll, { passive: false });
}

function handleNewsScroll(e) {
    if (isScrolling) return;
    
    const cards = document.querySelectorAll('.news-stack-card');
    const totalCards = cards.length;
    
    // Scroll vers le bas (card monte)
    if (e.deltaY > 0 && currentCardIndex < totalCards - 1) {
        e.preventDefault();
        isScrolling = true;
        currentCardIndex++;
        updateCardPositions();
        setTimeout(() => isScrolling = false, 600);
    }
    // Scroll vers le haut (card descend)
    else if (e.deltaY < 0 && currentCardIndex > 0) {
        e.preventDefault();
        isScrolling = true;
        currentCardIndex--;
        updateCardPositions();
        setTimeout(() => isScrolling = false, 600);
    }
}

function updateCardPositions() {
    const cards = document.querySelectorAll('.news-stack-card');
    const dateItems = document.querySelectorAll('.timeline-date-item');
    
    cards.forEach((card, index) => {
        const relativeIndex = index - currentCardIndex;
        
        // Cards passées (scrolled up)
        if (relativeIndex < 0) {
            card.classList.add('scrolled-up');
            card.setAttribute('data-index', relativeIndex);
        }
        // Cards visibles dans la pile
        else {
            card.classList.remove('scrolled-up');
            card.setAttribute('data-index', relativeIndex);
        }
    });
    
    // Update timeline
    dateItems.forEach((item, index) => {
        if (index === currentCardIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function jumpToCard(index) {
    if (isScrolling) return;
    isScrolling = true;
    currentCardIndex = index;
    updateCardPositions();
    setTimeout(() => isScrolling = false, 600);
}




// ==================== AUTH MODAL ====================

(function () {

    // ============================================================
    // BASE DE DONNÉES — localStorage
    // Clé : 'mvsiqva_users' → tableau de { email, password, createdAt }
    // Clé : 'mvsiqva_session' → { email } si connecté
    // ============================================================

    const DB_KEY      = 'mvsiqva_users';
    const SESSION_KEY = 'mvsiqva_session';

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }
        catch { return []; }
    }

    function saveUsers(users) {
        localStorage.setItem(DB_KEY, JSON.stringify(users));
    }

    function getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
        catch { return null; }
    }

    function saveSession(email) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ email, loginAt: new Date().toISOString() }));
    }

    function clearSession() {
        localStorage.removeItem(SESSION_KEY);
    }

    function userExists(email) {
        return getUsers().some(u => u.email.toLowerCase() === email.toLowerCase());
    }

    function registerUser(email, password) {
        const users = getUsers();
        users.push({ email, password, createdAt: new Date().toISOString() });
        saveUsers(users);
    }

    function loginUser(email, password) {
        return getUsers().some(
            u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
    }

    // ============================================================
    // ÉLÉMENTS DOM
    // ============================================================

    const overlay      = document.getElementById('authOverlay');
    const backdrop     = document.getElementById('authBackdrop');
    const closeBtn     = document.getElementById('authClose');
    const profilePic   = document.querySelector('.ProfilePicture');
    const viewLogin    = document.getElementById('viewLogin');
    const viewRegister = document.getElementById('viewRegister');
    const goToRegister = document.getElementById('goToRegister');
    const goToLogin    = document.getElementById('goToLogin');

    // Champs connexion
    const loginEmail   = viewLogin.querySelector('input[type="email"]');
    const loginPass    = viewLogin.querySelector('input[type="password"]');
    const loginBtn     = viewLogin.querySelector('.auth-submit');

    // Champs inscription
    const regEmail1    = document.getElementById('regEmail1');
    const regEmail2    = document.getElementById('regEmail2');
    const regPass1     = document.getElementById('regPass1');
    const regPass2     = document.getElementById('regPass2');
    const emailError   = document.getElementById('emailError');
    const passError    = document.getElementById('passError');
    const registerBtn  = viewRegister.querySelector('.auth-submit');

    // Indicateur force MDP
    const strengthFill  = document.getElementById('strengthFill');
    const strengthLabel = document.getElementById('strengthLabel');

    // ============================================================
    // FEEDBACK — toast discret en bas de la modale
    // ============================================================

    function showToast(message, type = 'success') {
        let toast = document.getElementById('authToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'authToast';
            toast.style.cssText = `
                position: absolute;
                bottom: 1.5vw; left: 50%; transform: translateX(-50%);
                padding: 0.7vw 1.8vw;
                border-radius: 3vw;
                font-size: clamp(0.7rem, 0.8vw, 0.9rem);
                font-weight: 600;
                pointer-events: none;
                z-index: 20;
                white-space: nowrap;
                transition: opacity 0.3s ease;
            `;
            document.getElementById('authModal').appendChild(toast);
        }

        toast.textContent = message;
        toast.style.background   = type === 'success' ? 'rgba(230,201,19,0.15)' : 'rgba(255,80,80,0.15)';
        toast.style.color        = type === 'success' ? 'rgb(230,201,19)' : 'rgba(255,100,100,0.9)';
        toast.style.border       = `1px solid ${type === 'success' ? 'rgba(230,201,19,0.4)' : 'rgba(255,80,80,0.4)'}`;
        toast.style.opacity      = '1';

        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }

    // ============================================================
    // ÉTAT CONNECTÉ — mise à jour de la photo de profil
    // ============================================================

    function updateProfileUI() {
        const session = getSession();
        if (session) {
            // Initiale de l'email comme avatar texte
            const initiale = session.email.charAt(0).toUpperCase();
            profilePic.style.background = 'linear-gradient(135deg, #e6c913, #c8a800)';
            profilePic.style.color      = '#000';
            profilePic.style.display    = 'flex';
            profilePic.style.alignItems = 'center';
            profilePic.style.justifyContent = 'center';
            profilePic.style.fontWeight = '700';
            profilePic.style.fontSize   = '1.4vw';
            profilePic.style.fontFamily = '"Playfair Display", serif';
            profilePic.alt              = initiale;
            // Masquer l'img et afficher un span à la place
            profilePic.src = '';
            profilePic.style.visibility = 'hidden';
            // Utiliser un pseudo-élément via un wrapper
            let badge = document.getElementById('profileBadge');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'profileBadge';
                badge.style.cssText = `
                    height: 4vw; width: 4vw;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #e6c913, #c8a800);
                    color: #000;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700;
                    font-size: 1.4vw;
                    font-family: "Playfair Display", serif;
                    cursor: pointer;
                    transition: transform 0.3s ease;
                    margin-top: 0.2vw;
                    box-shadow: 0 0 12px rgba(230,201,19,0.4);
                `;
                badge.addEventListener('mouseover', () => badge.style.transform = 'scale(1.15)');
                badge.addEventListener('mouseout',  () => badge.style.transform = 'scale(1)');
                badge.addEventListener('click', openModal);
                profilePic.parentElement.insertBefore(badge, profilePic);
                profilePic.style.display = 'none';
            }
            const profiles = JSON.parse(localStorage.getItem('mvsiqva_profiles') || '{}');
            const userProfile = profiles[session.email.toLowerCase()] || {};
            if (userProfile.avatar) {
                badge.style.background      = 'none';
                badge.style.backgroundImage = `url('${userProfile.avatar}')`;
                badge.style.backgroundSize  = 'cover';
                badge.style.backgroundPosition = 'center';
                badge.textContent           = '';
            } else {
                badge.style.backgroundImage = '';
                badge.style.background      = 'linear-gradient(135deg, #e6c913, #c8a800)';
                badge.textContent           = initiale;
            }
} else {
            profilePic.src     = 'media/DefaultProfilePicture.png';
            profilePic.style.display = '';
            profilePic.style.visibility = '';
            const badge = document.getElementById('profileBadge');
            if (badge) badge.remove();
        }
    }

    // ============================================================
    // OUVERTURE / FERMETURE
    // ============================================================

    function openModal() {
        // Si déjà connecté, ouvrir la page profil
        const session = getSession();
        if (session) {
            if (typeof window.openProfilePage === 'function') {
                window.openProfilePage();
            }
            return;
        }
        overlay.classList.add('open');
        // Réinitialiser sur la vue connexion
        viewLogin.classList.remove('hidden');
        viewRegister.classList.add('hidden');
        clearErrors();
    }

    profilePic.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
    });

    function closeModal() {
        overlay.classList.remove('open');
        clearErrors();
    }

    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // Switch vues
    goToRegister.addEventListener('click', function () {
        viewLogin.classList.add('hidden');
        viewRegister.classList.remove('hidden');
        clearErrors();
    });

    goToLogin.addEventListener('click', function () {
        viewRegister.classList.add('hidden');
        viewLogin.classList.remove('hidden');
        clearErrors();
    });

    function clearErrors() {
        if (emailError) emailError.textContent = '';
        if (passError)  passError.textContent  = '';
        document.querySelectorAll('.field-input.error').forEach(el => el.classList.remove('error'));
    }

    // ============================================================
    // AFFICHER / MASQUER MOT DE PASSE
    // ============================================================

    document.querySelectorAll('.field-eye').forEach(btn => {
        btn.addEventListener('click', function () {
            const inp = this.closest('.field-wrap').querySelector('.field-input');
            if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
        });
    });

    // ============================================================
    // FORCE DU MOT DE PASSE
    // ============================================================

    if (regPass1) {
        regPass1.addEventListener('input', function () {
            const v = this.value;
            let score = 0;
            if (v.length >= 8)           score++;
            if (/[A-Z]/.test(v))         score++;
            if (/[0-9]/.test(v))         score++;
            if (/[^A-Za-z0-9]/.test(v))  score++;

            const levels = [
                { pct: 0,   color: 'transparent',        label: '' },
                { pct: 25,  color: '#e05252',             label: 'Faible' },
                { pct: 50,  color: '#e09c52',             label: 'Moyen' },
                { pct: 75,  color: '#c8d452',             label: 'Fort' },
                { pct: 100, color: 'rgb(230, 201, 19)',   label: 'Excellent' },
            ];

            const lvl = levels[score] || levels[0];
            strengthFill.style.width      = lvl.pct + '%';
            strengthFill.style.background = lvl.color;
            strengthLabel.textContent     = lvl.label;
            strengthLabel.style.color     = lvl.color;
        });
    }

    // ============================================================
    // VALIDATION EN TEMPS RÉEL — inscription
    // ============================================================

    if (regEmail2) {
        regEmail2.addEventListener('input', function () {
            const match = this.value === regEmail1.value;
            emailError.textContent = (this.value && !match) ? 'Les adresses e-mail ne correspondent pas.' : '';
            this.classList.toggle('error', !!emailError.textContent);
        });
    }

    if (regPass2) {
        regPass2.addEventListener('input', function () {
            const match = this.value === regPass1.value;
            passError.textContent = (this.value && !match) ? 'Les mots de passe ne correspondent pas.' : '';
            this.classList.toggle('error', !!passError.textContent);
        });
    }

    // ============================================================
    // CONNEXION
    // ============================================================

    loginBtn.addEventListener('click', function () {
        const email = loginEmail.value.trim();
        const pass  = loginPass.value;

        if (!email || !pass) {
            showToast('Veuillez remplir tous les champs.', 'error');
            return;
        }

        if (!userExists(email)) {
            showToast('Aucun compte trouvé pour cet e-mail.', 'error');
            loginEmail.classList.add('error');
            return;
        }

        if (!loginUser(email, pass)) {
            showToast('Mot de passe incorrect.', 'error');
            loginPass.classList.add('error');
            return;
        }

        // Succès
        saveSession(email);
        updateProfileUI();
        closeModal();
        showToastGlobal(`Bienvenue, ${email.split('@')[0]} !`);
    });

    // ============================================================
    // INSCRIPTION
    // ============================================================

    registerBtn.addEventListener('click', function () {
        const email  = regEmail1.value.trim();
        const email2 = regEmail2.value.trim();
        const pass   = regPass1.value;
        const pass2  = regPass2.value;

        // Validations
        if (!email || !email2 || !pass || !pass2) {
            showToast('Veuillez remplir tous les champs.', 'error');
            return;
        }

        if (email !== email2) {
            emailError.textContent = 'Les adresses e-mail ne correspondent pas.';
            regEmail2.classList.add('error');
            return;
        }

        if (pass !== pass2) {
            passError.textContent = 'Les mots de passe ne correspondent pas.';
            regPass2.classList.add('error');
            return;
        }

        if (pass.length < 6) {
            showToast('Le mot de passe doit faire au moins 6 caractères.', 'error');
            regPass1.classList.add('error');
            return;
        }

        if (userExists(email)) {
            showToast('Un compte existe déjà avec cet e-mail.', 'error');
            regEmail1.classList.add('error');
            return;
        }

        // Enregistrement
        registerUser(email, pass);
        saveSession(email);
        updateProfileUI();
        closeModal();
        showToastGlobal(`Compte créé ! Bienvenue, ${email.split('@')[0]} !`);
    });

    // ============================================================
    // TOAST GLOBAL (hors modale, sur la page)
    // ============================================================

    function showToastGlobal(message) {
        let toast = document.getElementById('globalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'globalToast';
            toast.style.cssText = `
                position: fixed;
                top: 6vw; left: 50%; transform: translateX(-50%);
                padding: 0.8vw 2.5vw;
                background: rgba(230,201,19,0.12);
                border: 1px solid rgba(230,201,19,0.45);
                color: rgb(230,201,19);
                border-radius: 3vw;
                font-size: clamp(0.75rem, 0.9vw, 1rem);
                font-weight: 600;
                z-index: 9999;
                pointer-events: none;
                backdrop-filter: blur(10px);
                transition: opacity 0.4s ease;
                white-space: nowrap;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
    }

    // ============================================================
    // INIT — restaurer la session au chargement
    // ============================================================

    updateProfileUI();

    (function () {

    const PROFILE_KEY = 'mvsiqva_profiles';

    function getSession()  { try { return JSON.parse(localStorage.getItem('mvsiqva_session')); } catch { return null; } }
    function getUsers()    { try { return JSON.parse(localStorage.getItem('mvsiqva_users')) || []; } catch { return []; } }
    function saveUsers(u)  { localStorage.setItem('mvsiqva_users', JSON.stringify(u)); }
    function getProfiles() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; } }
    function saveProfiles(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

    function getProfileForEmail(email) { return getProfiles()[email.toLowerCase()] || {}; }
    function saveProfileForEmail(email, data) {
        const p = getProfiles();
        p[email.toLowerCase()] = { ...(p[email.toLowerCase()] || {}), ...data };
        saveProfiles(p);
    }

    // Stats fictives déterministes (toujours les mêmes pour un email donné)
    const STATS_POOL = [
        { minutes: '312', tracks: '87',  fav: 'Sundance',        artist: 'Népal' },
        { minutes: '184', tracks: '52',  fav: 'INCENDIE',         artist: 'Wallace Cleaver' },
        { minutes: '561', tracks: '143', fav: 'BARA',             artist: 'Yvnnis' },
        { minutes: '98',  tracks: '31',  fav: 'Mr Ledger 2',      artist: 'FEMTOGO' },
        { minutes: '427', tracks: '109', fav: 'En boucle',        artist: 'Adèle Castillon' },
    ];

    function getStatsForEmail(email) {
        let h = 0;
        for (let c of email) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
        return STATS_POOL[h % STATS_POOL.length];
    }

    // Éléments
    const profilePage     = document.getElementById('profilePage');
    const profileBannerBg = document.getElementById('profileBannerBg');
    const profileAvatarEl = document.getElementById('profileAvatarDisplay');
    const profileUsername = document.getElementById('profileUsername');
    const profileBioEl    = document.getElementById('profileBioDisplay');
    const profileEmailEl  = document.getElementById('profileEmailDisplay');
    const statMinutes = document.getElementById('statMinutes');
    const statTracks  = document.getElementById('statTracks');
    const statFav     = document.getElementById('statFav');
    const statArtist  = document.getElementById('statArtist');

    const setPseudo    = document.getElementById('setPseudo');
    const setBio       = document.getElementById('setBio');
    const setAvatar    = document.getElementById('setAvatar');
    const setBanner    = document.getElementById('setBanner');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    const setEmail       = document.getElementById('setEmail');
    const setPass1       = document.getElementById('setPass1');
    const setPass2       = document.getElementById('setPass2');
    const setCurrentPass = document.getElementById('setCurrentPass');
    const saveAccountBtn = document.getElementById('saveAccountBtn');
    const emailChangeError = document.getElementById('emailChangeError');
    const passChangeError  = document.getElementById('passChangeError');
    const currentPassError = document.getElementById('currentPassError');
    const deleteConfirmEmail = document.getElementById('deleteConfirmEmail');
    const deleteAccountBtn   = document.getElementById('deleteAccountBtn');

    // ---- Navigation ----

    function openProfilePage() {
        const session = getSession();
        if (!session) return;
        loadProfileUI(session.email);
        populateSettingsFields(session.email);
        document.body.classList.add('page-open');
        document.getElementById('worldPage').classList.remove('active');
        document.getElementById('newsPage').classList.remove('active');
        profilePage.classList.add('active');
        // Réinitialiser sur le 1er onglet
        document.querySelectorAll('.settings-tab').forEach((t,i) => t.classList.toggle('active', i===0));
        document.querySelectorAll('.settings-content').forEach((c,i) => c.classList.toggle('active', i===0));
    }

    function closeProfilePage() {
        profilePage.classList.remove('active');
    }

    document.getElementById('logoLink').addEventListener('click', closeProfilePage);
    document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', closeProfilePage));

    // ---- Charger l'affichage ----

    function loadProfileUI(email) {
        const profile = getProfileForEmail(email);
        const stats   = getStatsForEmail(email);
        const pseudo  = profile.pseudo || email.split('@')[0];

        const connectedEmail = document.getElementById('connectedEmailDisplay');
        if (connectedEmail) connectedEmail.textContent = email;

        profileBannerBg.style.backgroundImage = profile.banner ? `url('${profile.banner}')` : '';

        if (profile.avatar) {
            profileAvatarEl.style.backgroundImage = `url('${profile.avatar}')`;
            profileAvatarEl.textContent = '';
        } else {
            profileAvatarEl.style.backgroundImage = '';
            profileAvatarEl.textContent = email.charAt(0).toUpperCase();
        }

        profileUsername.textContent = pseudo;
        profileBioEl.textContent    = profile.bio || '';
        profileBioEl.style.display  = profile.bio ? 'block' : 'none';
        profileEmailEl.textContent  = email;

        statMinutes.textContent = stats.minutes;
        statTracks.textContent  = stats.tracks;
        statFav.textContent     = stats.fav;
        statArtist.textContent  = stats.artist;
    }

    function populateSettingsFields(email) {
        const p = getProfileForEmail(email);
        setPseudo.value = p.pseudo || '';
        setBio.value    = p.bio    || '';
        setAvatar.value = p.avatar || '';
        setBanner.value = p.banner || '';
        setEmail.value = setPass1.value = setPass2.value = setCurrentPass.value = '';
        clearErrors();
    }

    function clearErrors() {
        [emailChangeError, passChangeError, currentPassError].forEach(e => e.textContent = '');
        document.querySelectorAll('.setting-input.error').forEach(e => e.classList.remove('error'));
    }

    // ---- Onglets ----

    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const id = 'tab' + this.dataset.tab.charAt(0).toUpperCase() + this.dataset.tab.slice(1);
            document.getElementById(id).classList.add('active');
            clearErrors();
        });
    });

    // ---- Sauvegarder le profil ----

    saveProfileBtn.addEventListener('click', function () {
        const session = getSession();
        if (!session) return;
        saveProfileForEmail(session.email, {
            pseudo: setPseudo.value.trim(),
            bio:    setBio.value.trim(),
            avatar: setAvatar.value.trim(),
            banner: setBanner.value.trim(),
        });
        loadProfileUI(session.email);
        // Mettre à jour le badge dans la nav (photo OU initiale)
        const badge = document.getElementById('profileBadge');
        if (badge) {
            const p = getProfileForEmail(session.email);
            if (p.avatar) {
                badge.style.background         = 'none';
                badge.style.backgroundImage    = `url('${p.avatar}')`;
                badge.style.backgroundSize     = 'cover';
                badge.style.backgroundPosition = 'center';
                badge.textContent              = '';
            } else {
                badge.style.backgroundImage = '';
                badge.style.background      = 'linear-gradient(135deg, #e6c913, #c8a800)';
                badge.textContent           = (p.pseudo || session.email.split('@')[0]).charAt(0).toUpperCase();
            }
        }
        showProfileToast('Profil mis à jour !');
    });

    // ---- Mettre à jour le compte ----

    saveAccountBtn.addEventListener('click', function () {
        const session = getSession();
        if (!session) return;
        clearErrors();
        let err = false;

        const newEmail  = setEmail.value.trim();
        const newPass1  = setPass1.value;
        const newPass2  = setPass2.value;
        const curPass   = setCurrentPass.value;

        const users = getUsers();
        const user  = users.find(u => u.email.toLowerCase() === session.email.toLowerCase());

        if (!user || user.password !== curPass) {
            currentPassError.textContent = 'Mot de passe actuel incorrect.';
            setCurrentPass.classList.add('error');
            err = true;
        }

        if (newEmail) {
            if (!newEmail.includes('@')) {
                emailChangeError.textContent = "L'adresse e-mail doit contenir un @.";
                setEmail.classList.add('error');
                err = true;
            } else if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase() && u.email.toLowerCase() !== session.email.toLowerCase())) {
                emailChangeError.textContent = 'Cet e-mail est déjà utilisé.';
                setEmail.classList.add('error');
                err = true;
            }
        }

        if (newPass1 || newPass2) {
            if (newPass1 !== newPass2) {
                passChangeError.textContent = 'Les mots de passe ne correspondent pas.';
                setPass2.classList.add('error');
                err = true;
            } else if (newPass1.length < 6) {
                passChangeError.textContent = 'Minimum 6 caractères.';
                setPass1.classList.add('error');
                err = true;
            }
        }

        if (err) return;

        const idx = users.findIndex(u => u.email.toLowerCase() === session.email.toLowerCase());
        if (newEmail)  users[idx].email    = newEmail;
        if (newPass1)  users[idx].password = newPass1;
        saveUsers(users);

        const updatedEmail = newEmail || session.email;
        localStorage.setItem('mvsiqva_session', JSON.stringify({ email: updatedEmail, loginAt: new Date().toISOString() }));

        loadProfileUI(updatedEmail);
        setEmail.value = setPass1.value = setPass2.value = setCurrentPass.value = '';
        showProfileToast('Compte mis à jour !');
    });

    // ---- Supprimer le compte ----

    deleteAccountBtn.addEventListener('click', function () {
        const session = getSession();
        if (!session) return;

        if (deleteConfirmEmail.value.trim().toLowerCase() !== session.email.toLowerCase()) {
            deleteConfirmEmail.classList.add('error');
            showProfileToast('E-mail de confirmation incorrect.', 'error');
            return;
        }

        // Supprimer uniquement CE compte dans la liste
        saveUsers(getUsers().filter(u => u.email.toLowerCase() !== session.email.toLowerCase()));

        // Supprimer le profil de CE compte
        const profiles = getProfiles();
        delete profiles[session.email.toLowerCase()];
        saveProfiles(profiles);

        // Supprimer la session
        localStorage.removeItem('mvsiqva_session');

        // Fermer la page + remettre l'UI à zéro
        closeProfilePage();
        document.body.classList.remove('page-open');

        const pic = document.querySelector('.ProfilePicture');
        if (pic) {
            pic.src = 'media/DefaultProfilePicture.png';
            ['display','visibility','background','border','boxShadow'].forEach(s => pic.style[s] = '');
        }
        const badge = document.getElementById('profileBadge');
        if (badge) badge.remove();

        showProfileToast('Compte supprimé. À bientôt ! 👋');
    });

        const logoutBtn = document.getElementById('logoutBtn');
        const connectedEmailDisplay = document.getElementById('connectedEmailDisplay');

        logoutBtn.addEventListener('click', function () {
            localStorage.removeItem('mvsiqva_session');
            closeProfilePage();
            document.body.classList.remove('page-open');
            const pic = document.querySelector('.ProfilePicture');
            if (pic) {
                pic.src = 'media/DefaultProfilePicture.png';
                ['display', 'visibility', 'background', 'border', 'boxShadow'].forEach(s => pic.style[s] = '');
            }
            const badge = document.getElementById('profileBadge');
            if (badge) badge.remove();
            showProfileToast('Déconnecté avec succès !');
        });

        // ---- Toast ----

    function showProfileToast(message, type = 'success') {
        let t = document.getElementById('profileToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'profileToast';
            t.style.cssText = `
                position:fixed; bottom:3vw; right:3vw;
                padding:0.8vw 2vw; border-radius:3vw;
                font-size:clamp(0.72rem,0.82vw,0.95rem); font-weight:600;
                z-index:9999; pointer-events:none;
                backdrop-filter:blur(10px); transition:opacity 0.35s ease; white-space:nowrap;
            `;
            document.body.appendChild(t);
        }
        t.textContent      = message;
        t.style.background = type === 'success' ? 'rgba(230,201,19,0.12)' : 'rgba(255,80,80,0.12)';
        t.style.border     = `1px solid ${type === 'success' ? 'rgba(230,201,19,0.4)' : 'rgba(255,80,80,0.4)'}`;
        t.style.color      = type === 'success' ? 'rgb(230,201,19)' : 'rgba(255,100,100,0.9)';
        t.style.opacity    = '1';
        clearTimeout(t._t);
        t._t = setTimeout(() => t.style.opacity = '0', 3000);
    }

    // ---- Observer le badge pour patcher son clic vers la page profil ----

    const observer = new MutationObserver(() => {
        const badge = document.getElementById('profileBadge');
        if (badge && !badge._profileReady) {
            badge._profileReady = true;
            const fresh = badge.cloneNode(true);
            fresh._profileReady = true;
            badge.parentNode.replaceChild(fresh, badge);
            fresh.addEventListener('mouseover', () => fresh.style.transform = 'scale(1.15)');
            fresh.addEventListener('mouseout',  () => fresh.style.transform = 'scale(1)');
            fresh.addEventListener('click', openProfilePage);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
 
})(); // fin IIFE auth