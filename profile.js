// ============================================================
// PROFILE.JS — Page profil, paramètres, suppression de compte
// ============================================================

(function () {

    // ============================================================
    // DONNÉES — localStorage
    // ============================================================

    const PROFILE_KEY = 'mvsiqva_profiles';

    function getSession()    { try { return JSON.parse(localStorage.getItem('mvsiqva_session')); }  catch { return null; } }
    function getUsers()      { try { return JSON.parse(localStorage.getItem('mvsiqva_users')) || []; } catch { return []; } }
    function saveUsers(u)    { localStorage.setItem('mvsiqva_users', JSON.stringify(u)); }
    function getProfiles()   { try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }  catch { return {}; } }
    function saveProfiles(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

    function getProfileForEmail(email) {
        return getProfiles()[email.toLowerCase()] || {};
    }

    function saveProfileForEmail(email, data) {
        const p = getProfiles();
        p[email.toLowerCase()] = { ...(p[email.toLowerCase()] || {}), ...data };
        saveProfiles(p);
    }

    // Stats fictives déterministes (toujours les mêmes pour un email donné)
    const STATS_POOL = [
        { minutes: '312', tracks: '87',  fav: 'Sundance',   artist: 'Népal' },
        { minutes: '184', tracks: '52',  fav: 'INCENDIE',   artist: 'Wallace Cleaver' },
        { minutes: '561', tracks: '143', fav: 'BARA',       artist: 'Yvnnis' },
        { minutes: '98',  tracks: '31',  fav: 'Mr Ledger 2', artist: 'FEMTOGO' },
        { minutes: '427', tracks: '109', fav: 'En boucle',  artist: 'Adèle Castillon' },
    ];

    function getStatsForEmail(email) {
        let h = 0;
        for (let c of email) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
        return STATS_POOL[h % STATS_POOL.length];
    }

    // ============================================================
    // ÉLÉMENTS DOM
    // ============================================================

    const profilePage    = document.getElementById('profilePage');
    const profileBannerBg  = document.getElementById('profileBannerBg');
    const profileAvatarEl  = document.getElementById('profileAvatarDisplay');
    const profileUsername  = document.getElementById('profileUsername');
    const profileBioEl     = document.getElementById('profileBioDisplay');
    const profileEmailEl   = document.getElementById('profileEmailDisplay');
    const statMinutes = document.getElementById('statMinutes');
    const statTracks  = document.getElementById('statTracks');
    const statFav     = document.getElementById('statFav');
    const statArtist  = document.getElementById('statArtist');

    const setPseudo      = document.getElementById('setPseudo');
    const setBio         = document.getElementById('setBio');
    const setAvatar      = document.getElementById('setAvatar');
    const setBanner      = document.getElementById('setBanner');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    const setEmail         = document.getElementById('setEmail');
    const setPass1         = document.getElementById('setPass1');
    const setPass2         = document.getElementById('setPass2');
    const setCurrentPass   = document.getElementById('setCurrentPass');
    const saveAccountBtn   = document.getElementById('saveAccountBtn');
    const emailChangeError = document.getElementById('emailChangeError');
    const passChangeError  = document.getElementById('passChangeError');
    const currentPassError = document.getElementById('currentPassError');
    const deleteConfirmEmail = document.getElementById('deleteConfirmEmail');
    const deleteAccountBtn   = document.getElementById('deleteAccountBtn');
    const logoutBtn          = document.getElementById('logoutBtn');
    const connectedEmailDisplay = document.getElementById('connectedEmailDisplay');

    // ============================================================
    // OUVRIR / FERMER LA PAGE PROFIL
    // ============================================================

    window.openProfilePage = function () {
        const session = getSession();
        if (!session) return;
        loadProfileUI(session.email);
        populateSettingsFields(session.email);

        // Fermer toutes les pages
        document.getElementById('worldPage').classList.remove('active');
        document.getElementById('newsPage').classList.remove('active');
        const aboutPage = document.getElementById('aboutPage');
        if (aboutPage) aboutPage.classList.remove('active');

        const searchPage = document.getElementById('searchPage');
        if (searchPage) searchPage.classList.remove('active');

        document.body.classList.add('page-open');
        profilePage.classList.add('active');

        // Mettre à jour currentPage dans player.js
        if (typeof window.setCurrentPage === 'function') window.setCurrentPage('profile');

        // Masquer l'indicateur navbar et retirer toutes les classes actives
        // (Profile n'a pas de lien dédié dans la navbar)
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const indicator = document.querySelector('.nav-indicator');
        if (indicator) indicator.style.opacity = '0';

        // Remettre le premier onglet actif
        document.querySelectorAll('.settings-tab').forEach((t, i)     => t.classList.toggle('active', i === 0));
        document.querySelectorAll('.settings-content').forEach((c, i) => c.classList.toggle('active', i === 0));

        // Allumer le cercle doré sur le badge
        const badge = document.getElementById('profileBadge');
        if (window.setCurrentPage('profile')) badge.style.boxShadow = '0 0 0 2.5px rgb(230,201,19), 0 0 12px rgba(230,201,19,0.4)';
        else badge.style.boxShadow = '';
    };

    function closeProfilePage() {
        profilePage.classList.remove('active');
        document.body.classList.remove('page-open');
        if (typeof window.setCurrentPage === 'function') window.setCurrentPage('home');
    }

    document.getElementById('logoLink').addEventListener('click', closeProfilePage);
    document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', closeProfilePage));

    // ============================================================
    // CHARGER L'AFFICHAGE DU PROFIL
    // ============================================================

    function loadProfileUI(email) {
        const profile = getProfileForEmail(email);
        const stats   = getStatsForEmail(email);
        const pseudo  = profile.pseudo || email.split('@')[0];

        // Email connecté dans l'onglet danger
        if (connectedEmailDisplay) connectedEmailDisplay.textContent = email;

        // Bannière
        if (profileBannerBg) profileBannerBg.style.backgroundImage = profile.banner ? `url('${profile.banner}')` : '';

        // Avatar
        if (profileAvatarEl) {
            if (profile.avatar) {
                profileAvatarEl.style.backgroundImage = `url('${profile.avatar}')`;
                profileAvatarEl.textContent = '';
            } else {
                profileAvatarEl.style.backgroundImage = '';
                profileAvatarEl.textContent = email.charAt(0).toUpperCase();
            }
        }

        if (profileUsername) profileUsername.textContent = pseudo;
        if (profileBioEl)    { profileBioEl.textContent = profile.bio || ''; profileBioEl.style.display = profile.bio ? 'block' : 'none'; }
        if (profileEmailEl)  profileEmailEl.textContent = email;

        // Stats
        if (statMinutes) statMinutes.textContent = stats.minutes;
        if (statTracks)  statTracks.textContent  = stats.tracks;
        if (statFav)     statFav.textContent     = stats.fav;
        if (statArtist)  statArtist.textContent  = stats.artist;
    }

    function populateSettingsFields(email) {
        const p = getProfileForEmail(email);
        if (setPseudo)    setPseudo.value = p.pseudo || '';
        if (setBio)       setBio.value    = p.bio    || '';
        if (setAvatar)    setAvatar.value = p.avatar || '';
        if (setBanner)    setBanner.value = p.banner || '';
        if (setEmail)     setEmail.value  = '';
        if (setPass1)     setPass1.value  = '';
        if (setPass2)     setPass2.value  = '';
        if (setCurrentPass) setCurrentPass.value = '';
        clearErrors();
    }

    function clearErrors() {
        [emailChangeError, passChangeError, currentPassError].forEach(e => { if (e) e.textContent = ''; });
        document.querySelectorAll('.setting-input.error').forEach(e => e.classList.remove('error'));
    }

    // ============================================================
    // ONGLETS PARAMÈTRES
    // ============================================================

    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.settings-tab').forEach(t    => t.classList.remove('active'));
            document.querySelectorAll('.settings-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const id = 'tab' + this.dataset.tab.charAt(0).toUpperCase() + this.dataset.tab.slice(1);
            document.getElementById(id).classList.add('active');
            clearErrors();
        });
    });

    // ============================================================
    // SAUVEGARDER LE PROFIL
    // ============================================================

    if (saveProfileBtn) {
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

            // Mettre à jour le badge navbar
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
    }

    // ============================================================
    // METTRE À JOUR LE COMPTE (email + mot de passe)
    // ============================================================

    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', function () {
            const session = getSession();
            if (!session) return;
            clearErrors();
            let err = false;

            const newEmail = setEmail.value.trim();
            const newPass1 = setPass1.value;
            const newPass2 = setPass2.value;
            const curPass  = setCurrentPass.value;

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
            if (newEmail) users[idx].email    = newEmail;
            if (newPass1) users[idx].password = newPass1;
            saveUsers(users);

            const updatedEmail = newEmail || session.email;
            localStorage.setItem('mvsiqva_session', JSON.stringify({ email: updatedEmail, loginAt: new Date().toISOString() }));

            loadProfileUI(updatedEmail);
            setEmail.value = setPass1.value = setPass2.value = setCurrentPass.value = '';
            showProfileToast('Compte mis à jour !');
        });
    }

    // ============================================================
    // DÉCONNEXION
    // ============================================================

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            localStorage.removeItem('mvsiqva_session');
            closeProfilePage();
            if (typeof window.setCurrentPage === 'function') window.setCurrentPage('home');
            const pic = document.querySelector('.ProfilePicture');
            if (pic) {
                pic.src                = 'media/DefaultProfilePicture.png';
                pic.style.display      = '';
                pic.style.visibility   = '';
                pic.style.background   = '';
                pic.style.border       = '';
                pic.style.boxShadow    = '';
                pic.style.borderRadius = '';
            }
            const badge = document.getElementById('profileBadge');
            if (badge) badge.remove();
            showProfileToast('Déconnecté avec succès !');
        });
    }

    // ============================================================
    // SUPPRIMER LE COMPTE
    // ============================================================

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function () {
            const session = getSession();
            if (!session) return;

            if (deleteConfirmEmail.value.trim().toLowerCase() !== session.email.toLowerCase()) {
                deleteConfirmEmail.classList.add('error');
                showProfileToast('E-mail de confirmation incorrect.', 'error');
                return;
            }

            // Supprimer uniquement CE compte
            saveUsers(getUsers().filter(u => u.email.toLowerCase() !== session.email.toLowerCase()));

            // Supprimer le profil de CE compte
            const profiles = getProfiles();
            delete profiles[session.email.toLowerCase()];
            saveProfiles(profiles);

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

            showProfileToast('Compte supprimé. À bientôt ! 👋');
        });
    }

    // ============================================================
    // OBSERVER — patch le badge pour ouvrir la page profil
    // ============================================================

    const observer = new MutationObserver(() => {
        const badge = document.getElementById('profileBadge');
        if (badge && !badge._profileReady) {
            badge._profileReady = true;
            const fresh = badge.cloneNode(true);
            fresh._profileReady = true;
            badge.parentNode.replaceChild(fresh, badge);
            fresh.addEventListener('mouseover', () => fresh.style.transform = 'scale(1.15)');
            fresh.addEventListener('mouseout',  () => fresh.style.transform = 'scale(1)');
            fresh.addEventListener('click', window.openProfilePage);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // ============================================================
    // TOAST
    // ============================================================

    function showProfileToast(message, type = 'success') {
        let t = document.getElementById('profileToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'profileToast';
            t.style.cssText = `
                position: fixed; bottom: 3vw; right: 3vw;
                padding: 0.8vw 2vw; border-radius: 3vw;
                font-size: clamp(0.72rem, 0.82vw, 0.95rem); font-weight: 600;
                z-index: 9999; pointer-events: none;
                backdrop-filter: blur(10px); transition: opacity 0.35s ease; white-space: nowrap;
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

})();