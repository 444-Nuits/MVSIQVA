// ============================================================
// AUTH.JS — Inscription, connexion, session, badge navbar
// ============================================================

(function () {

    // ============================================================
    // BASE DE DONNÉES — localStorage
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

    const loginEmail  = viewLogin.querySelector('input[type="email"]');
    const loginPass   = viewLogin.querySelector('input[type="password"]');
    const loginBtn    = viewLogin.querySelector('.auth-submit');

    const regEmail1   = document.getElementById('regEmail1');
    const regEmail2   = document.getElementById('regEmail2');
    const regPass1    = document.getElementById('regPass1');
    const regPass2    = document.getElementById('regPass2');
    const emailError  = document.getElementById('emailError');
    const passError   = document.getElementById('passError');
    const registerBtn = viewRegister.querySelector('.auth-submit');

    const strengthFill  = document.getElementById('strengthFill');
    const strengthLabel = document.getElementById('strengthLabel');

    // ============================================================
    // BADGE NAVBAR — affiche photo ou initiale selon l'état
    // ============================================================

    function updateProfileUI() {
        const session = getSession();
        if (session) {
            const initiale = session.email.charAt(0).toUpperCase();
            profilePic.src              = '';
            profilePic.style.visibility = 'hidden';
            profilePic.style.display    = 'none';

            let badge = document.getElementById('profileBadge');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'profileBadge';
                badge.style.cssText = `
                    height: 3.5vw; width: 3.5vw;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #e6c913, #c8a800);
                    color: #000;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: 1.4vw;
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
            }

            // Photo de profil ou initiale
            const profiles   = JSON.parse(localStorage.getItem('mvsiqva_profiles') || '{}');
            const userProfile = profiles[session.email.toLowerCase()] || {};
            if (userProfile.avatar) {
                badge.style.background         = 'none';
                badge.style.backgroundImage    = `url('${userProfile.avatar}')`;
                badge.style.backgroundSize     = 'cover';
                badge.style.backgroundPosition = 'center';
                badge.textContent              = '';
            } else {
                badge.style.backgroundImage = '';
                badge.style.background      = 'linear-gradient(135deg, #e6c913, #c8a800)';
                badge.textContent           = initiale;
            }

        } else {
            // Déconnecté — remettre la photo par défaut
            profilePic.src                = 'media/DefaultProfilePicture.png';
            profilePic.style.display      = '';
            profilePic.style.visibility   = '';
            profilePic.style.background   = '';
            profilePic.style.border       = '';
            profilePic.style.boxShadow    = '';
            profilePic.style.borderRadius = '';
            const badge = document.getElementById('profileBadge');
            if (badge) badge.remove();
        }
    }

    // Exposer pour que profile.js puisse l'appeler après sauvegarde
    window.updateProfileUI = updateProfileUI;

    // ============================================================
    // OUVERTURE / FERMETURE DE LA MODALE
    // ============================================================

    function openModal() {
        const session = getSession();
        if (session) {
            // Connecté → ouvrir la page profil
            if (typeof window.openProfilePage === 'function') {
                window.openProfilePage();
            }
            return;
        }
        overlay.classList.add('open');
        viewLogin.classList.remove('hidden');
        viewRegister.classList.add('hidden');
        clearErrors();
    }

    function closeModal() {
        overlay.classList.remove('open');
        clearErrors();
    }

    profilePic.addEventListener('click', e => { e.preventDefault(); openModal(); });
    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    goToRegister.addEventListener('click', () => {
        viewLogin.classList.add('hidden');
        viewRegister.classList.remove('hidden');
        clearErrors();
    });

    goToLogin.addEventListener('click', () => {
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
            if (v.length >= 8)          score++;
            if (/[A-Z]/.test(v))        score++;
            if (/[0-9]/.test(v))        score++;
            if (/[^A-Za-z0-9]/.test(v)) score++;

            const levels = [
                { pct: 0,   color: 'transparent',      label: '' },
                { pct: 25,  color: '#e05252',           label: 'Faible' },
                { pct: 50,  color: '#e09c52',           label: 'Moyen' },
                { pct: 75,  color: '#c8d452',           label: 'Fort' },
                { pct: 100, color: 'rgb(230, 201, 19)', label: 'Excellent' },
            ];

            const lvl = levels[score] || levels[0];
            strengthFill.style.width      = lvl.pct + '%';
            strengthFill.style.background = lvl.color;
            strengthLabel.textContent     = lvl.label;
            strengthLabel.style.color     = lvl.color;
        });
    }

    // ============================================================
    // VALIDATION EN TEMPS RÉEL
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

        if (!email || !pass) { showToast('Veuillez remplir tous les champs.', 'error'); return; }
        if (!userExists(email)) { showToast('Aucun compte trouvé pour cet e-mail.', 'error'); loginEmail.classList.add('error'); return; }
        if (!loginUser(email, pass)) { showToast('Mot de passe incorrect.', 'error'); loginPass.classList.add('error'); return; }

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

        if (!email || !email2 || !pass || !pass2) { showToast('Veuillez remplir tous les champs.', 'error'); return; }
        if (email !== email2) { emailError.textContent = 'Les adresses e-mail ne correspondent pas.'; regEmail2.classList.add('error'); return; }
        if (pass !== pass2)   { passError.textContent  = 'Les mots de passe ne correspondent pas.';   regPass2.classList.add('error');  return; }
        if (pass.length < 6)  { showToast('Le mot de passe doit faire au moins 6 caractères.', 'error'); regPass1.classList.add('error'); return; }
        if (userExists(email)) { showToast('Un compte existe déjà avec cet e-mail.', 'error'); regEmail1.classList.add('error'); return; }

        registerUser(email, pass);
        saveSession(email);
        updateProfileUI();
        closeModal();
        showToastGlobal(`Compte créé ! Bienvenue, ${email.split('@')[0]} !`);
    });

    // ============================================================
    // TOASTS
    // ============================================================

    function showToast(message, type = 'success') {
        let toast = document.getElementById('authToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'authToast';
            toast.style.cssText = `
                position: absolute; bottom: 1.5vw; left: 50%; transform: translateX(-50%);
                padding: 0.7vw 1.8vw; border-radius: 3vw;
                font-size: clamp(0.7rem, 0.8vw, 0.9rem); font-weight: 600;
                pointer-events: none; z-index: 20; white-space: nowrap;
                transition: opacity 0.3s ease;
            `;
            document.getElementById('authModal').appendChild(toast);
        }
        toast.textContent            = message;
        toast.style.background       = type === 'success' ? 'rgba(230,201,19,0.15)' : 'rgba(255,80,80,0.15)';
        toast.style.color            = type === 'success' ? 'rgb(230,201,19)' : 'rgba(255,100,100,0.9)';
        toast.style.border           = `1px solid ${type === 'success' ? 'rgba(230,201,19,0.4)' : 'rgba(255,80,80,0.4)'}`;
        toast.style.opacity          = '1';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }

    function showToastGlobal(message) {
        let toast = document.getElementById('globalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'globalToast';
            toast.style.cssText = `
                position: fixed; top: 6vw; left: 50%; transform: translateX(-50%);
                padding: 0.8vw 2.5vw;
                background: rgba(230,201,19,0.12); border: 1px solid rgba(230,201,19,0.45);
                color: rgb(230,201,19); border-radius: 3vw;
                font-size: clamp(0.75rem, 0.9vw, 1rem); font-weight: 600;
                z-index: 9999; pointer-events: none;
                backdrop-filter: blur(10px); transition: opacity 0.4s ease; white-space: nowrap;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent    = message;
        toast.style.opacity  = '1';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
    }

    // ============================================================
    // INIT — restaurer la session au chargement de la page
    // ============================================================

    updateProfileUI();

})();
