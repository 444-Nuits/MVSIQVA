// ============================================================
// SOCIAL.JS — Page sociale : recherche, suggestions, suivi
// Les utilisateurs fictifs sont chargés depuis users.json
// via fetch() — pas de données en dur dans ce fichier.
// ============================================================

(function () {

    // ============================================================
    // CLÉS LOCALSTORAGE
    // (session + follows de l'utilisateur réel uniquement)
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
            const data = await res.json();
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

    // Fusionne les follows seeds (lecture seule) avec ceux stockés localement
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

        const follows        = getFollows();
        const myEmail        = session.email.toLowerCase();
        const target         = targetEmail.toLowerCase();
        follows[myEmail]     = follows[myEmail] || [];

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
        const lc      = email.toLowerCase();
        const local   = getProfiles()[lc] || {};
        const seed    = _seedUsers.find(u => u.email.toLowerCase() === lc) || {};

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

    // Liste complète des emails (seeds + comptes réels créés via auth.js)
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
    // Permet à auth.js de reconnaître les comptes seeds lors de la connexion
    // ============================================================

    function syncSeedsToLocalStorage() {
        let users = [];
        try { users = JSON.parse(localStorage.getItem('mvsiqva_users') || '[]'); } catch {}

        const existing = users.map(u => u.email.toLowerCase());
        let usersChanged = false;

        _seedUsers.forEach(s => {
            if (!existing.includes(s.email.toLowerCase())) {
                users.push({ email: s.email, password: s.password, createdAt: new Date().toISOString() });
                usersChanged = true;
            }
        });
        if (usersChanged) localStorage.setItem('mvsiqva_users', JSON.stringify(users));

        const profiles        = getProfiles();
        let profilesChanged   = false;
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

            const p    = getUserProfile(email);
            let reason = null;
            let type   = 'new-member';
            let score  = 0;

            // 1. Goûts similaires — artiste ou titre favori
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
                const commonFriends = myFollow.filter(f => (follows[f] || []).includes(email));
                if (commonFriends.length > 0) {
                    const friendP = getUserProfile(commonFriends[0]);
                    reason = `Suivi par <strong>${friendP.pseudo}</strong>`;
                    type   = 'friend-of-friend';
                    score += 5 + commonFriends.length * 2;
                }
            }

            // 3. Fallback populaire / nouveau membre
            if (!reason) {
                const followers = Object.values(follows).filter(arr => arr.includes(email)).length;
                if (followers >= 3) {
                    reason = `${followers} abonnés sur MVSIQVA`;
                    score += followers;
                } else {
                    reason = 'Membre de MVSIQVA';
                    score += 1;
                }
            }

            scored.push({ email, profile: p, reason, type, score });
        });

        // Trier par score puis interleave les types
        scored.sort((a, b) => b.score - a.score);

        const buckets = {};
        scored.forEach(item => {
            buckets[item.type] = buckets[item.type] || [];
            buckets[item.type].push(item);
        });
        const keys        = Object.keys(buckets);
        const interleaved = [];
        let added = true;
        while (added) {
            added = false;
            keys.forEach(k => {
                if (buckets[k].length) { interleaved.push(buckets[k].shift()); added = true; }
            });
        }
        return interleaved.slice(0, 24);
    }

    // ============================================================
    // RENDU DES CARTES
    // ============================================================

    function badgeLabel(type) {
        if (type === 'similar-artist')   return 'Fav. artist';
        if (type === 'similar-track')    return 'Fav. track';
        if (type === 'friend-of-friend') return 'Friend of friend';
        return 'Discover';
    }

    function renderCard(item, delay = 0) {
        const { email, profile, reason, type } = item;
        const following   = isFollowing(email);
        const initial     = profile.pseudo.charAt(0).toUpperCase();
        const avatarStyle = profile.avatar
            ? `background-image:url('${profile.avatar}'); background-size:cover; background-position:center;`
            : '';

        const card = document.createElement('div');
        card.className            = 'social-user-card';
        card.style.animationDelay = delay + 'ms';
        card.dataset.email        = email;

        card.innerHTML = `
            <span class="social-card-badge ${type}">${badgeLabel(type)}</span>
            <div class="social-card-avatar" style="${avatarStyle}">${profile.avatar ? '' : initial}</div>
            <div class="social-card-name">${escHtml(profile.pseudo)}</div>
            <div class="social-card-artist">🎵 ${escHtml(profile.favArtist)}</div>
            <div class="social-card-reason">${reason}</div>
            <button class="social-follow-btn${following ? ' following' : ''}" data-email="${escAttr(email)}">
                ${following ? 'Abonné' : 'Suivre'}
            </button>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.social-follow-btn')) return;
            openUserPanel(email);
        });

        card.querySelector('.social-follow-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const btn          = e.currentTarget;
            const nowFollowing = toggleFollow(email);
            btn.textContent    = nowFollowing ? 'Abonné' : 'Suivre';
            btn.classList.toggle('following', nowFollowing);
            showSocialToast(nowFollowing ? `Vous suivez ${profile.pseudo} !` : `Vous ne suivez plus ${profile.pseudo}.`);
            refreshFollowingRow();
            syncPanelFollowBtn(email, nowFollowing);
        });

        return card;
    }

    function renderSkeletons(container, count = 8) {
        container.innerHTML = Array.from({ length: count }, () => `
            <div class="social-skeleton-card">
                <div class="skeleton-block" style="width:5vw;height:5vw;min-width:56px;min-height:56px;border-radius:50%;"></div>
                <div class="skeleton-block" style="width:60%;height:14px;border-radius:4px;"></div>
                <div class="skeleton-block" style="width:45%;height:11px;border-radius:4px;"></div>
                <div class="skeleton-block" style="width:80%;height:11px;border-radius:4px;"></div>
                <div class="skeleton-block" style="width:50%;height:28px;border-radius:3vw;margin-top:4px;"></div>
            </div>
        `).join('');
    }

    // ============================================================
    // CHARGEMENT DE LA VUE PAR DÉFAUT
    // ============================================================

    async function loadDefaultView() {
        const grid = document.getElementById('socialSuggestionsGrid');
        renderSkeletons(grid);

        await fetchUsers();          // charge users.json
        syncSeedsToLocalStorage();   // synchronise vers auth.js

        const suggestions = buildSuggestions();
        grid.innerHTML = '';

        if (!suggestions.length) {
            grid.innerHTML = `
                <div class="social-empty" style="grid-column:1/-1">
                    <span>👥</span>
                    <p>Aucun utilisateur à suggérer pour l'instant.</p>
                </div>`;
            return;
        }

        suggestions.forEach((item, i) => grid.appendChild(renderCard(item, i * 40)));
        refreshFollowingRow();
    }

    function refreshFollowingRow() {
        const row     = document.getElementById('socialFollowingRow');
        const section = document.getElementById('socialFollowingSection');
        const follows = getMyFollows();

        if (!follows.length) { section.style.display = 'none'; return; }

        section.style.display = 'block';
        row.innerHTML = follows.map(email => {
            const p           = getUserProfile(email);
            const initial     = p.pseudo.charAt(0).toUpperCase();
            const avatarStyle = p.avatar
                ? `background-image:url('${p.avatar}'); background-size:cover; background-position:center;`
                : '';
            return `
                <div class="social-following-chip" onclick="window._socialOpenPanel('${escAttr(email)}')">
                    <div class="social-following-avatar" style="${avatarStyle}">${p.avatar ? '' : initial}</div>
                    <div class="social-following-name">${escHtml(p.pseudo)}</div>
                </div>
            `;
        }).join('');
    }

    // ============================================================
    // RECHERCHE
    // ============================================================

    async function doSearch(query) {
        const q        = query.trim().toLowerCase();
        const defaultV = document.getElementById('socialDefaultView');
        const resultsV = document.getElementById('socialResultsView');
        const grid     = document.getElementById('socialResultsGrid');
        const empty    = document.getElementById('socialResultsEmpty');
        const label    = document.getElementById('socialResultsLabel');

        if (!q) {
            defaultV.style.display = 'block';
            resultsV.style.display = 'none';
            document.getElementById('socialSearchClear').style.display = 'none';
            return;
        }

        defaultV.style.display = 'none';
        resultsV.style.display = 'block';
        document.getElementById('socialSearchClear').style.display = 'flex';

        await fetchUsers();

        const session = getSession();
        const myEmail = session ? session.email.toLowerCase() : null;

        const results = getAllEmails()
            .filter(email => email !== myEmail)
            .map(email => ({ email, profile: getUserProfile(email) }))
            .filter(({ email, profile }) =>
                profile.pseudo.toLowerCase().includes(q) ||
                email.includes(q) ||
                profile.favArtist.toLowerCase().includes(q)
            );

        label.innerHTML = `
            <span class="social-section-line"></span>
            ${results.length} résultat${results.length !== 1 ? 's' : ''} pour « ${escHtml(query.trim())} »
            <span class="social-section-line"></span>
        `;

        grid.innerHTML = '';

        if (!results.length) {
            empty.style.display = 'flex';
            grid.style.display  = 'none';
            return;
        }

        empty.style.display = 'none';
        grid.style.display  = '';

        results.forEach(({ email, profile }, i) => {
            grid.appendChild(renderCard({
                email,
                profile,
                reason: profile.favArtist !== '—' ? `🎵 ${profile.favArtist}` : 'Membre MVSIQVA',
                type: 'new-member',
            }, i * 40));
        });
    }

    // ============================================================
    // PANNEAU PROFIL UTILISATEUR
    // ============================================================

    function openUserPanel(email) {
        const panel     = document.getElementById('socialUserPanel');
        const content   = document.getElementById('socialPanelContent');
        const p         = getUserProfile(email);
        const following = isFollowing(email);

        const session    = getSession();
        const commonRows = [];

        if (session) {
            const myP = getUserProfile(session.email);
            if (myP.favArtist !== '—' && myP.favArtist === p.favArtist) {
                commonRows.push(`<div class="social-panel-common-row">
                    <span class="social-panel-common-icon">🎵</span>
                    <span class="social-panel-common-text">Artiste favori commun : <strong>${escHtml(p.favArtist)}</strong></span>
                </div>`);
            }
            if (myP.favTrack !== '—' && myP.favTrack === p.favTrack) {
                commonRows.push(`<div class="social-panel-common-row">
                    <span class="social-panel-common-icon">🎧</span>
                    <span class="social-panel-common-text">Titre favori commun : <strong>${escHtml(p.favTrack)}</strong></span>
                </div>`);
            }

            const follows     = getMergedFollows();
            const myFollow    = getMyFollows();
            const theirFollow = follows[email] || [];
            const common      = myFollow.filter(f => theirFollow.includes(f));
            if (common.length) {
                const names = common.slice(0, 3).map(e => getUserProfile(e).pseudo).join(', ');
                commonRows.push(`<div class="social-panel-common-row">
                    <span class="social-panel-common-icon">👥</span>
                    <span class="social-panel-common-text">Abonnements communs : <strong>${escHtml(names)}</strong></span>
                </div>`);
            }
        }

        const initial     = p.pseudo.charAt(0).toUpperCase();
        const avatarStyle = p.avatar
            ? `background-image:url('${p.avatar}'); background-size:cover; background-position:center;`
            : '';

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

            ${commonRows.length ? `
                <p class="social-panel-section-title">Points communs</p>
                ${commonRows.join('')}
            ` : ''}

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
            </button>
        `;

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
    // OUVERTURE / FERMETURE DE LA PAGE
    // ============================================================

    window.openSocialPage = async function () {
        ['worldPage', 'newsPage', 'aboutPage', 'profilePage'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });

        const page = document.getElementById('socialPage');
        page.classList.add('active');
        document.body.classList.add('page-open');
        if (typeof window.setCurrentPage === 'function') window.setCurrentPage('social');

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

        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === '#social') {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    window.openSocialPage();
                });
            }
        });

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
                this.value = '';
                clearBtn.style.display = 'none';
                doSearch('');
            }
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value      = '';
            clearBtn.style.display = 'none';
            doSearch('');
        });

        document.getElementById('logoLink').addEventListener('click', () => {
            const page = document.getElementById('socialPage');
            if (page) page.classList.remove('active');
        });

        document.querySelectorAll('.nav-link').forEach(l => {
            l.addEventListener('click', () => {
                const page = document.getElementById('socialPage');
                if (page && l.getAttribute('href') !== '#social') page.classList.remove('active');
            });
        });
    });

})();