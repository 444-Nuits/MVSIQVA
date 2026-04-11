// ============================================================
// SOCIAL.JS — Social page: search, suggestions, follow system
// Seed users are loaded from users.json via fetch().
// ============================================================

(function () {

    // ============================================================
    // LOCALSTORAGE KEYS
    // ============================================================

    const SESSION_KEY  = 'mvsiqva_session';
    const FOLLOWS_KEY  = 'mvsiqva_follows';
    const PROFILES_KEY = 'mvsiqva_profiles';

    // In-memory cache — filled once by fetchUsers()
    let _seedUsers   = [];
    let _seedFollows = {};

    // ============================================================
    // LOAD users.json (fetch + memory cache)
    // ============================================================

    async function fetchUsers() {
        if (_seedUsers.length > 0) return true; // already loaded
        try {
            const res = await fetch('data/users.json');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data   = await res.json();
            _seedUsers   = data.users   || [];
            _seedFollows = data.follows || {};
            return true;
        } catch (err) {
            console.error('[Social] Could not load users.json:', err);
            _seedUsers   = [];
            _seedFollows = {};
            return false; // signals failure to caller
        }
    }

    // ============================================================
    // LOCALSTORAGE HELPERS
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
        if (!session) { showSocialToast('Log in to follow users.', 'error'); return false; }

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
    // USER PROFILE
    // Priority: localStorage (edited) > users.json > fallback
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
    // SYNC SEEDS → localStorage
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
    // SUGGESTION ALGORITHM
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

            // 1. Similar tastes
            if (myEmail && session) {
                const myP = getUserProfile(myEmail);
                if (myP.favArtist !== '—' && p.favArtist === myP.favArtist) {
                    reason = `You both love <strong>${p.favArtist}</strong>`;
                    type   = 'similar-artist';
                    score += 10;
                } else if (myP.favTrack !== '—' && p.favTrack === myP.favTrack) {
                    reason = `Same favourite track: <em>${p.favTrack}</em>`;
                    type   = 'similar-track';
                    score += 7;
                }
            }

            // 2. Friend of friend
            if (!reason) {
                const theirFollows = follows[email] || [];
                const common       = myFollow.filter(f => theirFollows.includes(f));
                if (common.length) {
                    const name = getUserProfile(common[0]).pseudo;
                    reason = `Followed by <strong>${name}</strong>`;
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
    // RENDER — DEFAULT VIEW
    // ============================================================

    async function loadDefaultView() {
        const grid = document.getElementById('socialSuggestionsGrid');

        // Show loading skeletons while fetching
        renderSkeletons(grid);

        const ok = await fetchUsers();

        // If fetch failed, show a visible error with a retry button
        if (!ok) {
            renderError(grid, loadDefaultView);
            return;
        }

        syncSeedsToLocalStorage();
        renderSuggestions();
        renderFollowingRow();
    }

    // Loading skeletons — shown while users.json is being fetched
    function renderSkeletons(grid) {
        grid.innerHTML = Array.from({ length: 6 }, () => `
            <div class="social-user-card" style="pointer-events:none;">
                <div class="social-card-avatar skeleton-block"></div>
                <div class="skeleton-block" style="width:60%;height:13px;border-radius:4px;margin:8px auto 6px;"></div>
                <div class="skeleton-block" style="width:40%;height:11px;border-radius:4px;margin:0 auto 10px;"></div>
                <div class="skeleton-block" style="width:70px;height:28px;border-radius:2vw;margin:0 auto;"></div>
            </div>`).join('');
    }

    // Visible error message shown when users.json fails to load
    function renderError(container, retryFn) {
        container.innerHTML = `
            <div style="
                grid-column: 1 / -1;
                display: flex; flex-direction: column; align-items: center;
                gap: 1vw; padding: 3vw 0; text-align: center;
            ">
                <span style="font-size:2.5vw;">📡</span>
                <p style="color:rgba(255,255,255,0.6);font-size:1.1vw;margin:0;">
                    Could not load user data.
                </p>
                <p style="color:rgba(255,255,255,0.3);font-size:0.85vw;margin:0;">
                    Check your connection or try again later.
                </p>
                <button onclick="window._socialRetry()" style="
                    margin-top:0.5vw; padding:0.6vw 2vw;
                    background:rgba(230,201,19,0.1); border:1px solid rgba(230,201,19,0.4);
                    color:rgb(230,201,19); border-radius:3vw; cursor:pointer;
                    font-size:0.9vw; font-family:inherit;
                ">Retry</button>
            </div>`;

        // Expose retry function globally so the inline onclick can reach it
        window._socialRetry = async function () {
            _seedUsers   = []; // reset cache so fetchUsers() tries again
            _seedFollows = {};
            const page = document.getElementById('socialPage');
            if (page) delete page.dataset.loaded;
            await retryFn();
        };
    }

    function renderSuggestions() {
        const grid        = document.getElementById('socialSuggestionsGrid');
        const suggestions = buildSuggestions();

        if (!suggestions.length) {
            grid.innerHTML = `<p style="color:rgba(255,255,255,0.3);font-size:1vw;grid-column:1/-1;">No suggestions yet.</p>`;
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
                    ${following ? 'Following' : 'Follow'}
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
    // SEARCH
    // ============================================================

    function doSearch(query) {
        const grid = document.getElementById('socialSuggestionsGrid');
        const q    = query.trim().toLowerCase();

        if (!q) { renderSuggestions(); return; }

        const results = getAllEmails()
            .filter(email => {
                const p = getUserProfile(email);
                return p.pseudo.toLowerCase().includes(q) || email.includes(q);
            })
            .map(email => ({ email, p: getUserProfile(email) }));

        if (!results.length) {
            grid.innerHTML = `<p style="color:rgba(255,255,255,0.3);font-size:1vw;grid-column:1/-1;">No user found.</p>`;
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
                    ${following ? 'Following' : 'Follow'}
                </button>
            </div>`;
        }).join('');
    }

    // ============================================================
    // FOLLOW
    // ============================================================

    window.handleFollowClick = function (btn, email) {
        const nowFollowing = toggleFollow(email);
        btn.textContent    = nowFollowing ? 'Following' : 'Follow';
        btn.classList.toggle('following', nowFollowing);
        const pseudo = getUserProfile(email).pseudo;
        showSocialToast(nowFollowing ? `You are now following ${pseudo}!` : `You unfollowed ${pseudo}.`);
        refreshFollowingRow();
        syncPanelFollowBtn(email, nowFollowing);
    };

    function refreshFollowingRow() { renderFollowingRow(); }

    function syncPanelFollowBtn(email, nowFollowing) {
        const panelBtn = document.getElementById('panelFollowBtn');
        if (panelBtn && panelBtn.dataset.email === email) {
            panelBtn.textContent = nowFollowing ? '✓ Following' : '+ Follow';
            panelBtn.classList.toggle('following', nowFollowing);
        }
    }

    function syncCardFollowBtn(email, nowFollowing) {
        document.querySelectorAll(`.social-follow-btn[data-email="${email}"]`).forEach(btn => {
            btn.textContent = nowFollowing ? 'Following' : 'Follow';
            btn.classList.toggle('following', nowFollowing);
        });
    }

    // ============================================================
    // USER PANEL
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
                rows.push(`<div class="social-panel-common-row"><span class="social-panel-common-icon">🎤</span><span class="social-panel-common-text">Same favourite artist: <strong>${escHtml(p.favArtist)}</strong></span></div>`);
            if (p.favTrack !== '—' && p.favTrack === myP.favTrack)
                rows.push(`<div class="social-panel-common-row"><span class="social-panel-common-icon">🎵</span><span class="social-panel-common-text">Same favourite track: <strong>${escHtml(p.favTrack)}</strong></span></div>`);
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
                    <div class="social-panel-stat-label">tracks</div>
                </div>
            </div>
            ${commonRows.length ? `<p class="social-panel-section-title">In common</p>${commonRows.join('')}` : ''}
            <p class="social-panel-section-title" style="margin-top:${commonRows.length ? '1.4vw' : '0'}">Favourite artist</p>
            <div class="social-panel-common-row">
                <span class="social-panel-common-icon">🎤</span>
                <span class="social-panel-common-text"><strong>${escHtml(p.favArtist)}</strong></span>
            </div>
            <p class="social-panel-section-title" style="margin-top:0.8vw">Favourite track</p>
            <div class="social-panel-common-row">
                <span class="social-panel-common-icon">🎵</span>
                <span class="social-panel-common-text"><strong>${escHtml(p.favTrack)}</strong></span>
            </div>
            <button class="social-panel-follow-btn${following ? ' following' : ''}" id="panelFollowBtn" data-email="${escAttr(email)}">
                ${following ? '✓ Following' : '+ Follow'}
            </button>`;

        content.querySelector('#panelFollowBtn').addEventListener('click', function () {
            const nowFollowing = toggleFollow(email);
            this.textContent   = nowFollowing ? '✓ Following' : '+ Follow';
            this.classList.toggle('following', nowFollowing);
            showSocialToast(nowFollowing ? `You are now following ${p.pseudo}!` : `You unfollowed ${p.pseudo}.`);
            refreshFollowingRow();
            syncCardFollowBtn(email, nowFollowing);
        });

        panel.classList.add('active');
    }

    // ============================================================
    // PAGE OPEN — uses centralized router + Social-specific init
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