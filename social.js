// ============================================================
// SOCIAL.JS — Page sociale : recherche, suggestions, suivi
// Les utilisateurs fictifs sont chargés depuis users.json
// via fetch() — pas de données en dur dans ce fichier.
// ============================================================

(function () {

    // ============================================================
    // CLÉS LOCALSTORAGE
    // ============================================================

    const SESSION_KEY  = 'mvsiqva_session';
    const FOLLOWS_KEY  = 'mvsiqva_follows';
    const PROFILES_KEY = 'mvsiqva_profiles';

    // Cache mémoire — rempli une seule fois par fetchUsers()
    let _seedUsers   = [];
    let _seedFollows = {};

    // ============================================================
    // CHARGEMENT DE users.json (fetch + cache mémoire)
    // ============================================================

    async function fetchUsers() {
        if (_seedUsers.length > 0) return;
        try {
            const res = await fetch('data/users.json');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data   = await res.json();
            _seedUsers   = data.users   || [];
            _seedFollows = data.follows || {};
        } catch (err) {
            console.error('[Social] Impossible de charger users.json :', err);
            _seedUsers   = [];
            _seedFollows = {};
        }
    }

    // ============================================================
    // LOCALSTORAGE
    // ============================================================

    function getSession()    { try { return JSON.parse(localStorage.getItem(SESSION_KEY));        } catch { return null; } }
    function getProfiles()   { try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || {}; } catch { return {}; } }
    function saveProfiles(p) { localStorage.setItem(PROFILES_KEY, JSON.stringify(p)); }
    function getFollows()    { try { return JSON.parse(localStorage.getItem(FOLLOWS_KEY)) || {};  } catch { return {}; } }
    function saveFollows(f)  { localStorage.setItem(FOLLOWS_KEY, JSON.stringify(f)); }

    function getMergedFollows() {
        const merged = Object.assign({}, _seedFollows);
        const local  = getFollows();
        Object.keys(local).forEach(k => { merged[k] = local[k]; });
        return merged;
    }

    function getMyFollows() {
        const session = getSession();
        if (!session) return [];
        return getMergedFollows()[session.email.toLowerCase()] || [];
    }

    function isFollowing(targetEmail) {
        return getMyFollows().includes(targetEmail.toLowerCase());
    }

    function toggleFollow(targetEmail) {
        const session = getSession();
        if (!session) { showSocialToast('Connectez-vous pour suivre des utilisateurs.', 'error'); return false; }

        const follows    = getFollows();
        const myEmail    = session.email.toLowerCase();
        const target     = targetEmail.toLowerCase();
        follows[myEmail] = follows[myEmail] || [];

        if (follows[myEmail].includes(target)) {
            follows[myEmail] = follows[myEmail].filter(e => e !== target);
            saveFollows(follows);
            return false;
        } else {
            follows[myEmail].push(target);
            saveFollows(follows);
            return true;
        }
    }

    // ============================================================
    // PROFIL D'UN UTILISATEUR
    // Priorité : localStorage (profil édité) > users.json > fallback
    // ============================================================

    function getUserProfile(email) {
        const lc    = email.toLowerCase();
        const local = getProfiles()[lc] || {};
        const seed  = _seedUsers.find(u => u.email.toLowerCase() === lc) || {};
        return {
            email,
            pseudo:    local.pseudo    || seed.pseudo    || email.split('@')[0],
            bio:       local.bio       || seed.bio       || '',
            avatar:    local.avatar    || '',
            favArtist: local.favArtist || seed.favArtist || '—',
            favTrack:  local.favTrack  || seed.favTrack  || '—',
            minutes:   seed.minutes    || '—',
            tracks:    seed.tracks     || '—',
        };
    }

    function getAllEmails() {
        const seedEmails = _seedUsers.map(u => u.email.toLowerCase());
        let realEmails   = [];
        try {
            const raw  = JSON.parse(localStorage.getItem('mvsiqva_users') || '[]');
            realEmails = raw
                .filter(u => u.password !== '__seed__')
                .map(u => u.email.toLowerCase());
        } catch {}
        return [...new Set([...seedEmails, ...realEmails])];
    }

    // ============================================================
    // SYNCHRONISATION DES SEEDS → localStorage
    // ============================================================

    function syncSeedsToLocalStorage() {
        let users = [];
        try { users = JSON.parse(localStorage.getItem('mvsiqva_users') || '[]'); } catch {}

        const existing    = users.map(u => u.email.toLowerCase());
        let usersChanged  = false;

        _seedUsers.forEach(s => {
            if (!existing.includes(s.email.toLowerCase())) {
                users.push({ email: s.email, password: s.password, createdAt: new Date().toISOString() });
                usersChanged = true;
            }
        });
        if (usersChanged) localStorage.setItem('mvsiqva_users', JSON.stringify(users));

        const profiles      = getProfiles();
        let profilesChanged = false;
        _seedUsers.forEach(s => {
            const k = s.email.toLowerCase();
            if (!profiles[k]) {
                profiles[k]     = { pseudo: s.pseudo, bio: s.bio, avatar: '', banner: '', favArtist: s.favArtist, favTrack: s.favTrack };
                profilesChanged = true;
            }
        });
        if (profilesChanged) saveProfiles(profiles);
    }

    // ============================================================
    // ALGORITHME DE SUGGESTIONS
    // ============================================================

    function buildSuggestions() {
        const session   = getSession();
        const myEmail   = session ? session.email.toLowerCase() : null;
        const myFollow  = getMyFollows();
        const follows   = getMergedFollows();
        const allEmails = getAllEmails();

        const scored = [];

        allEmails.forEach(email => {
            if (email === myEmail)        return;
            if (myFollow.includes(email)) return;

            const p     = getUserProfile(email);
            let reason  = null;
            let type    = 'new-member';
            let score   = 0;

            // 1. Goûts similaires
            if (myEmail && session) {
                const myP = getUserProfile(myEmail);
                if (myP.favArtist !== '—' && p.favArtist === myP.favArtist) {
                    reason = `Vous aimez tous les deux <strong>${p.favArtist}</strong>`;
                    type   = 'similar-artist';
                    score += 10;
                } else if (myP.favTrack !== '—' && p.favTrack === myP.favTrack) {
                    reason = `Même titre favori : <em>${p.favTrack}</em>`;
                    type   = 'similar-track';
                    score += 7;
                }
            }

            // 2. Ami d'ami
            if (!reason) {
                const theirFollows = follows[email] || [];
                const common       = myFollow.filter(f => theirFollows.includes(f));
                if (common.length) {
                    const name = getUserProfile(common[0]).pseudo;
                    reason = `Suivi par <strong>${name}</strong>`;
                    type   = 'friend-of-friend';
                    score += 5;
                }
            }

            scored.push({ email, p, reason, type, score });
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 12);
    }

    // ============================================================
    // RENDU — VUE PAR DÉFAUT
    // ============================================================

    async function loadDefaultView() {
        await fetchUsers();
        syncSeedsToLocalStorage();
        renderSuggestions();
        renderFollowingRow();
    }

    function renderSuggestions() {
        const grid        = document.getElementById('socialGrid');
        const suggestions = buildSuggestions();

        if (!suggestions.length) {
            grid.innerHTML = `<p style="color:rgba(255,255,255,0.3);font-size:1vw;grid-column:1/-1;">Aucune suggestion pour le moment.</p>`;
            return;
        }

        grid.innerHTML = suggestions.map(({ email, p, reason, type }) => {
            const following   = isFollowing(email);
            const initial     = (p.pseudo || email).charAt(0).toUpperCase();
            const avatarStyle = p.avatar ? `background-image:url('${escAttr(p.avatar)}');background-size:cover;background-position:center;` : '';

            return `
            <div class="social-user-card" onclick="window._socialOpenPanel('${escAttr(email)}')">
                <div class="social-card-avatar" style="${avatarStyle}">${p.avatar ? '' : initial}</div>
                <div class="social-card-name">${escHtml(p.pseudo)}</div>
                ${reason ? `<div class="social-card-reason">${reason}</div>` : ''}
                <span class="social-card-badge ${type}">${badgeLabel(type)}</span>
                <button class="social-follow-btn${following ? ' following' : ''}" data-email="${escAttr(email)}"
                    onclick="event.stopPropagation(); handleFollowClick(this, '${escAttr(email)}')">
                    ${following ? 'Abonné' : 'Suivre'}
                </button>
            </div>`;
        }).join('');
    }

    function badgeLabel(type) {
        if (type === 'similar-artist')   return 'Fav. artist';
        if (type === 'similar-track')    return 'Fav. track';
        if (type === 'friend-of-friend') return 'Friend of friend';
        return 'New';
    }

    function renderFollowingRow() {
        const myFollows = getMyFollows();
        const section   = document.getElementById('socialFollowingSection');
        const row       = document.getElementById('socialFollowingRow');
        if (!section || !row) return;

        if (!myFollows.length) { section.style.display = 'none'; return; }
        section.style.display = 'block';

        row.innerHTML = myFollows.map(email => {
            const p       = getUserProfile(email);
            const initial = (p.pseudo || email).charAt(0).toUpperCase();
            const style   = p.avatar ? `background-image:url('${escAttr(p.avatar)}');background-size:cover;background-position:center;` : '';
            return `
            <div class="social-following-chip" onclick="window._socialOpenPanel('${escAttr(email)}')">
                <div class="social-following-avatar" style="${style}">${p.avatar ? '' : initial}</div>
                <span class="social-following-name">${escHtml(p.pseudo)}</span>
            </div>`;
        }).join('');
    }

    // ============================================================
    // RECHERCHE
    // ============================================================

    function doSearch(query) {
        const grid = document.getElementById('socialGrid');
        const q    = query.trim().toLowerCase();

        if (!q) { renderSuggestions(); return; }

        const results = getAllEmails()
            .filter(email => {
                const p = getUserProfile(email);
                return p.pseudo.toLowerCase().includes(q) || email.includes(q);
            })
            .map(email => ({ email, p: getUserProfile(email) }));

        if (!results.length) {
            grid.innerHTML = `<p style="color:rgba(255,255,255,0.3);font-size:1vw;grid-column:1/-1;">Aucun utilisateur trouvé.</p>`;
            return;
        }

        grid.innerHTML = results.map(({ email, p }) => {
            const following   = isFollowing(email);
            const initial     = (p.pseudo || email).charAt(0).toUpperCase();
            const avatarStyle = p.avatar ? `background-image:url('${escAttr(p.avatar)}');background-size:cover;background-position:center;` : '';
            return `
            <div class="social-user-card" onclick="window._socialOpenPanel('${escAttr(email)}')">
                <div class="social-card-avatar" style="${avatarStyle}">${p.avatar ? '' : initial}</div>
                <div class="social-card-name">${escHtml(p.pseudo)}</div>
                <button class="social-follow-btn${following ? ' following' : ''}" data-email="${escAttr(email)}"
                    onclick="event.stopPropagation(); handleFollowClick(this, '${escAttr(email)}')">
                    ${following ? 'Abonné' : 'Suivre'}
                </button>
            </div>`;
        }).join('');
    }

    // ============================================================
    // FOLLOW
    // ============================================================

    window.handleFollowClick = function (btn, email) {
        const nowFollowing = toggleFollow(email);
        btn.textContent    = nowFollowing ? 'Abonné' : 'Suivre';
        btn.classList.toggle('following', nowFollowing);
        showSocialToast(nowFollowing ? `Vous suivez ${getUserProfile(email).pseudo} !` : `Vous ne suivez plus ${getUserProfile(email).pseudo}.`);
        refreshFollowingRow();
        syncPanelFollowBtn(email, nowFollowing);
    };

    function refreshFollowingRow() { renderFollowingRow(); }

    function syncPanelFollowBtn(email, nowFollowing) {
        const panelBtn = document.getElementById('panelFollowBtn');
        if (panelBtn && panelBtn.dataset.email === email) {
            panelBtn.textContent = nowFollowing ? '✓ Abonné' : '+ Suivre';
            panelBtn.classList.toggle('following', nowFollowing);
        }
    }

    function syncCardFollowBtn(email, nowFollowing) {
        document.querySelectorAll(`.social-follow-btn[data-email="${email}"]`).forEach(btn => {
            btn.textContent = nowFollowing ? 'Abonné' : 'Suivre';
            btn.classList.toggle('following', nowFollowing);
        });
    }

    // ============================================================
    // PANNEAU UTILISATEUR
    // ============================================================

    function openUserPanel(email) {
        const panel   = document.getElementById('socialUserPanel');
        const content = document.getElementById('socialPanelContent');
        const p       = getUserProfile(email);
        const following   = isFollowing(email);
        const initial     = (p.pseudo || email).charAt(0).toUpperCase();
        const avatarStyle = p.avatar
            ? `background-image:url('${escAttr(p.avatar)}');background-size:cover;background-position:center;`
            : '';

        const myEmail   = getSession()?.email?.toLowerCase();
        const commonRows = myEmail ? (() => {
            const myP  = getUserProfile(myEmail);
            const rows = [];
            if (p.favArtist !== '—' && p.favArtist === myP.favArtist)
                rows.push(`<div class="social-panel-common-row"><span class="social-panel-common-icon">🎤</span><span class="social-panel-common-text">Même artiste favori : <strong>${escHtml(p.favArtist)}</strong></span></div>`);
            if (p.favTrack !== '—' && p.favTrack === myP.favTrack)
                rows.push(`<div class="social-panel-common-row"><span class="social-panel-common-icon">🎵</span><span class="social-panel-common-text">Même titre favori : <strong>${escHtml(p.favTrack)}</strong></span></div>`);
            return rows;
        })() : [];

        content.innerHTML = `
            <div class="social-panel-hero">
                <div class="social-panel-avatar" style="${avatarStyle}">${p.avatar ? '' : initial}</div>
                <div class="social-panel-name">${escHtml(p.pseudo)}</div>
                ${p.bio ? `<p class="social-panel-bio">${escHtml(p.bio)}</p>` : ''}
                <p class="social-panel-email">${escHtml(email)}</p>
            </div>
            <div class="social-panel-stats">
                <div class="social-panel-stat">
                    <div class="social-panel-stat-val">${p.minutes}</div>
                    <div class="social-panel-stat-label">minutes</div>
                </div>
                <div class="social-panel-stat">
                    <div class="social-panel-stat-val">${p.tracks}</div>
                    <div class="social-panel-stat-label">titres</div>
                </div>
            </div>
            ${commonRows.length ? `<p class="social-panel-section-title">Points communs</p>${commonRows.join('')}` : ''}
            <p class="social-panel-section-title" style="margin-top:${commonRows.length ? '1.4vw' : '0'}">Artiste favori</p>
            <div class="social-panel-common-row">
                <span class="social-panel-common-icon">🎤</span>
                <span class="social-panel-common-text"><strong>${escHtml(p.favArtist)}</strong></span>
            </div>
            <p class="social-panel-section-title" style="margin-top:0.8vw">Titre favori</p>
            <div class="social-panel-common-row">
                <span class="social-panel-common-icon">🎵</span>
                <span class="social-panel-common-text"><strong>${escHtml(p.favTrack)}</strong></span>
            </div>
            <button class="social-panel-follow-btn${following ? ' following' : ''}" id="panelFollowBtn" data-email="${escAttr(email)}">
                ${following ? '✓ Abonné' : '+ Suivre'}
            </button>`;

        content.querySelector('#panelFollowBtn').addEventListener('click', function () {
            const nowFollowing = toggleFollow(email);
            this.textContent   = nowFollowing ? '✓ Abonné' : '+ Suivre';
            this.classList.toggle('following', nowFollowing);
            showSocialToast(nowFollowing ? `Vous suivez ${p.pseudo} !` : `Vous ne suivez plus ${p.pseudo}.`);
            refreshFollowingRow();
            syncCardFollowBtn(email, nowFollowing);
        });

        panel.classList.add('active');
    }

    // ============================================================
    // OUVERTURE DE LA PAGE
    // Utilise le routeur centralisé + callback d'init propre à Social
    // ============================================================

    window.openSocialPage = async function () {
        window.navigateTo('social');
        const page = document.getElementById('socialPage');
        if (!page.dataset.loaded) {
            page.dataset.loaded = '1';
            await loadDefaultView();
        } else {
            refreshFollowingRow();
        }
    };

    window._socialOpenPanel = openUserPanel;

    // ============================================================
    // TOAST
    // ============================================================

    function showSocialToast(message, type = 'success') {
        let t = document.getElementById('socialToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'socialToast';
            t.style.cssText = `
                position: fixed; bottom: 3vw; left: 50%; transform: translateX(-50%);
                padding: 0.8vw 2.5vw; border-radius: 3vw;
                font-size: clamp(0.72rem, 0.85vw, 1rem); font-weight: 600;
                z-index: 9999; pointer-events: none;
                backdrop-filter: blur(10px); transition: opacity 0.35s ease;
                white-space: nowrap;
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

    // ============================================================
    // UTILS
    // ============================================================

    function escHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function escAttr(s) {
        return String(s).replace(/"/g, '&quot;');
    }

    // ============================================================
    // INIT — DOMContentLoaded
    // ============================================================

    document.addEventListener('DOMContentLoaded', function () {

        document.getElementById('socialPanelClose').addEventListener('click', () => {
            document.getElementById('socialUserPanel').classList.remove('active');
        });

        document.getElementById('socialPage').addEventListener('click', function (e) {
            const panel = document.getElementById('socialUserPanel');
            if (panel.classList.contains('active') && !panel.contains(e.target)) {
                panel.classList.remove('active');
            }
        });

        const searchInput = document.getElementById('socialSearchInput');
        const clearBtn    = document.getElementById('socialSearchClear');
        let   debounce;

        searchInput.addEventListener('input', function () {
            clearTimeout(debounce);
            debounce = setTimeout(() => doSearch(this.value), 350);
            clearBtn.style.display = this.value ? 'flex' : 'none';
        });

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                this.value             = '';
                clearBtn.style.display = 'none';
                doSearch('');
            }
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value      = '';
            clearBtn.style.display = 'none';
            doSearch('');
        });
    });

})();