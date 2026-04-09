// ============================================================
// SEARCH.JS — Recherche artistes + titres, fiche artiste
// Last.fm + iTunes + Wikipedia via backend
// ============================================================

(function () {

    const API_BASE = 'https://mvsiqva-api.onrender.com';

    // ==================== ÉTAT ====================

    let isSearching     = false;
    let previewAudio    = null;
    let previewBtn      = null;
    let searchDebounce  = null;
    const HISTORY_KEY   = 'mvsiqva_search_history';

    // ==================== OUVERTURE / FERMETURE ====================

    window.openSearchPage = function () {
    const page = document.getElementById('searchPage');
    if (!page) return;

    // Fermer toutes les autres pages d'abord
    document.getElementById('worldPage').classList.remove('active');
    const newsPage = document.getElementById('newsPage');
    if (newsPage) newsPage.classList.remove('active');
    const aboutPage = document.getElementById('aboutPage');
    if (aboutPage) aboutPage.classList.remove('active');
    const profilePage = document.getElementById('profilePage');
    if (profilePage) profilePage.classList.remove('active');
    const chartsPage = document.getElementById('chartsPage');
    if (chartsPage) chartsPage.classList.remove('active');
    const socialPage = document.getElementById('socialPage');
if (socialPage) socialPage.classList.remove('active');

    // Ouvrir Search
    page.classList.add('active');
    document.body.classList.add('page-open');
    if (typeof window.setCurrentPage === 'function') window.setCurrentPage('search');

    setTimeout(() => document.getElementById('searchMainInput').focus(), 400);
    if (!document.getElementById('searchDefaultView').dataset.loaded) {
        loadDefaultView();
    }
};

    // ==================== VUE PAR DÉFAUT (tendances + historique) ====================

    async function loadDefaultView() {
        const view = document.getElementById('searchDefaultView');
        view.dataset.loaded = '1';

        renderHistory();
        renderDefaultSkeletons();

        try {
            // Top artistes + top titres en parallèle
            const [artistsRes, tracksRes] = await Promise.all([
                fetch(`${API_BASE}/api/search/trending/artists`),
                fetch(`${API_BASE}/api/search/trending/tracks`),
            ]);
            const artistsData = await artistsRes.json();
            const tracksData  = await tracksRes.json();
            renderTrendingArtists(artistsData.artists || []);
            renderTrendingTracks(tracksData.tracks   || []);
        } catch (e) {
            console.error('Erreur tendances :', e);
            document.getElementById('trendingArtistsWrap').innerHTML =
                '<p style="color:rgba(255,255,255,0.3);font-size:0.9vw;">Impossible de charger les tendances.</p>';
            document.getElementById('trendingTracksWrap').innerHTML = '';
        }
    }

    function renderDefaultSkeletons() {
        document.getElementById('trendingArtistsWrap').innerHTML =
            Array.from({length: 6}, () => `
                <div class="artist-card skeleton-card">
                    <div class="artist-card-img skeleton-block"></div>
                    <div class="skeleton-block" style="width:70%;height:13px;border-radius:4px;margin:8px auto 4px;"></div>
                    <div class="skeleton-block" style="width:45%;height:11px;border-radius:4px;margin:0 auto;"></div>
                </div>`).join('');

        document.getElementById('trendingTracksWrap').innerHTML =
            Array.from({length: 8}, () => `
                <div class="search-track-row">
                    <div class="skeleton-block" style="width:40px;height:40px;border-radius:6px;flex-shrink:0;"></div>
                    <div style="flex:1;">
                        <div class="skeleton-block" style="width:55%;height:13px;border-radius:4px;margin-bottom:5px;"></div>
                        <div class="skeleton-block" style="width:35%;height:11px;border-radius:4px;"></div>
                    </div>
                </div>`).join('');
    }

    function renderHistory() {
        const history = getHistory();
        const wrap    = document.getElementById('searchHistoryWrap');
        const section = document.getElementById('searchHistorySection');
        if (!history.length) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        wrap.innerHTML = history.map(q => `
            <button class="history-chip" onclick="triggerSearch('${escHtml(q)}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                ${escHtml(q)}
                <span class="history-chip-remove" onclick="event.stopPropagation(); removeHistory('${escHtml(q)}')">✕</span>
            </button>`).join('');
    }

    function renderTrendingArtists(artists) {
        document.getElementById('trendingArtistsWrap').innerHTML = artists.map(a => `
            <div class="artist-card" onclick="openArtistPanel('${escAttr(a.name)}')">
                <div class="artist-card-img" style="${a.image ? `background-image:url('${escAttr(a.image)}')` : ''}">
                    ${!a.image ? `<span class="artist-card-initial">${escHtml(a.name.charAt(0))}</span>` : ''}
                </div>
                <div class="artist-card-name">${escHtml(a.name)}</div>
                <div class="artist-card-listeners">${a.listeners || ''}</div>
            </div>`).join('');
    }

    function renderTrendingTracks(tracks) {
        document.getElementById('trendingTracksWrap').innerHTML = tracks.map((t, i) => `
            <div class="search-track-row" onclick="playPreviewTrack('${escAttr(t.previewUrl || '')}', '${escAttr(t.title)}', '${escAttr(t.artist)}', this)">
                <div class="search-track-cover" style="${t.cover ? `background-image:url('${escAttr(t.cover)}')` : ''}">
                    ${!t.cover ? `<span style="font-size:1.2vw;">🎵</span>` : ''}
                    ${t.previewUrl ? `<div class="search-track-play-overlay">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>` : ''}
                </div>
                <div class="search-track-info">
                    <div class="search-track-title">${escHtml(t.title)}</div>
                    <div class="search-track-artist" onclick="event.stopPropagation(); openArtistPanel('${escAttr(t.artist)}')">${escHtml(t.artist)}</div>
                </div>
                ${t.duration ? `<div class="search-track-duration">${t.duration}</div>` : ''}
            </div>`).join('');
    }

    // ==================== RECHERCHE ====================

    function triggerSearch(query) {
        const input = document.getElementById('searchMainInput');
        input.value = query;
        doSearch(query);
    }

    async function doSearch(query) {
        if (!query.trim() || isSearching) return;
        isSearching = true;

        addHistory(query);
        showResultsView();
        renderSearchSkeletons();

        try {
            const [artistsRes, tracksRes] = await Promise.all([
                fetch(`${API_BASE}/api/search/artists?q=${encodeURIComponent(query)}`),
                fetch(`${API_BASE}/api/search/tracks?q=${encodeURIComponent(query)}`),
            ]);
            const artistsData = await artistsRes.json();
            const tracksData  = await tracksRes.json();
            renderSearchArtists(artistsData.artists || [], query);
            renderSearchTracks(tracksData.tracks   || [], query);
        } catch (e) {
            console.error('Erreur recherche :', e);
        } finally {
            isSearching = false;
        }
    }

    function renderSearchSkeletons() {
        document.getElementById('searchArtistsWrap').innerHTML =
            Array.from({length: 4}, () => `
                <div class="artist-card skeleton-card">
                    <div class="artist-card-img skeleton-block"></div>
                    <div class="skeleton-block" style="width:70%;height:13px;border-radius:4px;margin:8px auto 4px;"></div>
                </div>`).join('');
        document.getElementById('searchTracksWrap').innerHTML =
            Array.from({length: 6}, () => `
                <div class="search-track-row">
                    <div class="skeleton-block" style="width:40px;height:40px;border-radius:6px;flex-shrink:0;"></div>
                    <div style="flex:1;">
                        <div class="skeleton-block" style="width:55%;height:13px;border-radius:4px;margin-bottom:5px;"></div>
                        <div class="skeleton-block" style="width:35%;height:11px;border-radius:4px;"></div>
                    </div>
                </div>`).join('');
    }

    function renderSearchArtists(artists, query) {
        const section = document.getElementById('searchArtistsSection');
        const wrap    = document.getElementById('searchArtistsWrap');
        document.getElementById('searchArtistsLabel').textContent =
            `Artistes pour "${query}"`;
        if (!artists.length) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        wrap.innerHTML = artists.map(a => `
            <div class="artist-card" onclick="openArtistPanel('${escAttr(a.name)}')">
                <div class="artist-card-img" style="${a.image ? `background-image:url('${escAttr(a.image)}')` : ''}">
                    ${!a.image ? `<span class="artist-card-initial">${escHtml(a.name.charAt(0))}</span>` : ''}
                </div>
                <div class="artist-card-name">${escHtml(a.name)}</div>
                <div class="artist-card-listeners">${a.listeners || ''}</div>
            </div>`).join('');
    }

    function renderSearchTracks(tracks, query) {
        const section = document.getElementById('searchTracksSection');
        const wrap    = document.getElementById('searchTracksWrap');
        document.getElementById('searchTracksLabel').textContent =
            `Titres pour "${query}"`;
        if (!tracks.length) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        wrap.innerHTML = tracks.map(t => `
            <div class="search-track-row" onclick="playPreviewTrack('${escAttr(t.previewUrl || '')}', '${escAttr(t.title)}', '${escAttr(t.artist)}', this)">
                <div class="search-track-cover" style="${t.cover ? `background-image:url('${escAttr(t.cover)}')` : ''}">
                    ${!t.cover ? `<span style="font-size:1.2vw;">🎵</span>` : ''}
                    ${t.previewUrl ? `<div class="search-track-play-overlay">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>` : ''}
                </div>
                <div class="search-track-info">
                    <div class="search-track-title">${escHtml(t.title)}</div>
                    <div class="search-track-artist" onclick="event.stopPropagation(); openArtistPanel('${escAttr(t.artist)}')">${escHtml(t.artist)}</div>
                </div>
                ${t.duration ? `<div class="search-track-duration">${t.duration}</div>` : ''}
            </div>`).join('');
    }

    // ==================== FICHE ARTISTE ====================

    window.openArtistPanel = async function (artistName) {
        stopPreview();
        const panel = document.getElementById('artistPanel');
        panel.classList.add('active');
        renderArtistSkeleton();

        try {
            const res  = await fetch(`${API_BASE}/api/search/artist?name=${encodeURIComponent(artistName)}`);
            const data = await res.json();
            renderArtistPanel(data);
        } catch (e) {
            console.error('Erreur fiche artiste :', e);
        }
    };

    function closeArtistPanel() {
        const panel = document.getElementById('artistPanel');
        if (panel) panel.classList.remove('active');
        stopPreview();
    }

    window.closeSearchPage = function () {
    stopPreview();
    closeArtistPanel();
    const page = document.getElementById('searchPage');
    if (!page) return;
    page.classList.remove('active');
};

    function renderArtistSkeleton() {
        document.getElementById('artistPanelContent').innerHTML = `
            <div class="artist-panel-hero">
                <div class="skeleton-block" style="width:7vw;height:7vw;border-radius:50%;"></div>
                <div style="flex:1;">
                    <div class="skeleton-block" style="width:40%;height:2vw;border-radius:6px;margin-bottom:8px;"></div>
                    <div class="skeleton-block" style="width:25%;height:1vw;border-radius:4px;"></div>
                </div>
            </div>
            <div class="skeleton-block" style="width:100%;height:80px;border-radius:8px;margin:1vw 0;"></div>
            ${Array.from({length:5}, () => `
                <div class="search-track-row" style="margin-bottom:0.5vw;">
                    <div class="skeleton-block" style="width:40px;height:40px;border-radius:6px;flex-shrink:0;"></div>
                    <div style="flex:1;">
                        <div class="skeleton-block" style="width:55%;height:13px;border-radius:4px;margin-bottom:5px;"></div>
                        <div class="skeleton-block" style="width:30%;height:11px;border-radius:4px;"></div>
                    </div>
                </div>`).join('')}`;
    }

    function renderArtistPanel(data) {
        const { name, bio, image, listeners, tracks } = data;
        document.getElementById('artistPanelContent').innerHTML = `
            <div class="artist-panel-hero">
                <div class="artist-panel-avatar" style="${image ? `background-image:url('${escAttr(image)}')` : ''}">
                    ${!image ? `<span>${escHtml((name||'?').charAt(0))}</span>` : ''}
                </div>
                <div class="artist-panel-meta">
                    <h2 class="artist-panel-name">${escHtml(name || '—')}</h2>
                    ${listeners ? `<p class="artist-panel-listeners">${listeners} auditeurs</p>` : ''}
                </div>
            </div>
            ${bio ? `<p class="artist-panel-bio">${escHtml(bio)}</p>` : ''}
            <h3 class="artist-panel-section-title">Top 5 titres</h3>
            <div class="artist-panel-tracks">
                ${(tracks || []).map((t, i) => `
                    <div class="search-track-row" onclick="playPreviewTrack('${escAttr(t.previewUrl||'')}', '${escAttr(t.title)}', '${escAttr(name)}', this)">
                        <span class="artist-track-rank">${i + 1}</span>
                        <div class="search-track-cover" style="${t.cover ? `background-image:url('${escAttr(t.cover)}')` : ''}">
                            ${!t.cover ? `<span style="font-size:1.2vw;">🎵</span>` : ''}
                            ${t.previewUrl ? `<div class="search-track-play-overlay">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                            </div>` : ''}
                        </div>
                        <div class="search-track-info">
                            <div class="search-track-title">${escHtml(t.title)}</div>
                            ${t.album ? `<div class="search-track-artist">${escHtml(t.album)}</div>` : ''}
                        </div>
                        ${t.duration ? `<div class="search-track-duration">${t.duration}</div>` : ''}
                    </div>`).join('')}
            </div>`;
    }

    // ==================== PREVIEW AUDIO ====================

    window.playPreviewTrack = function (url, title, artist, rowEl) {
        if (!url) return;

        if (previewBtn === rowEl) { stopPreview(); return; }
        stopPreview();

        previewAudio = new Audio(url);
        previewBtn   = rowEl;
        rowEl.classList.add('playing');
        previewAudio.play().catch(() => {});
        previewAudio.addEventListener('ended', stopPreview);
    };

    function stopPreview() {
        if (previewAudio) { previewAudio.pause(); previewAudio = null; }
        if (previewBtn)   { previewBtn.classList.remove('playing'); previewBtn = null; }
    }

    // ==================== VUES ====================

    function showResultsView() {
        document.getElementById('searchDefaultView').style.display  = 'none';
        document.getElementById('searchResultsView').style.display  = 'block';
        document.getElementById('searchClearBtn').style.display     = 'flex';
    }

    function showDefaultView() {
        document.getElementById('searchDefaultView').style.display  = 'block';
        document.getElementById('searchResultsView').style.display  = 'none';
        document.getElementById('searchClearBtn').style.display     = 'none';
        document.getElementById('searchMainInput').value            = '';
        renderHistory();
    }

    // ==================== HISTORIQUE ====================

    function getHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
        catch { return []; }
    }

    function addHistory(query) {
        let h = getHistory().filter(q => q !== query);
        h.unshift(query);
        h = h.slice(0, 8);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    }

    window.removeHistory = function (query) {
        const h = getHistory().filter(q => q !== query);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
        renderHistory();
    };

    // ==================== UTILS ====================

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function escAttr(s) {
        return String(s).replace(/"/g,'&quot;');
    }

    // ==================== INIT ====================

    document.addEventListener('DOMContentLoaded', function () {
        
        // Effet sticky scroll — le titre disparaît quand on scrolle
const searchBody = document.querySelector('.search-body');
const searchHero = document.querySelector('.search-hero');

searchBody.addEventListener('scroll', function () {
    if (this.scrollTop > 30) {
        searchHero.classList.add('scrolled');
    } else {
        searchHero.classList.remove('scrolled');
    }
});

// Fermer le panneau artiste en cliquant en dehors
document.getElementById('searchPage').addEventListener('click', function(e) {
    const panel = document.getElementById('artistPanel');
    if (panel.classList.contains('active') && 
        !panel.contains(e.target)) {
        closeArtistPanel();
    }
});

        // Lien navbar Search
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === '#search') {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    window.openSearchPage();
                });
            }
        });

        // Bouton fermer fiche artiste
        document.getElementById('artistPanelClose').addEventListener('click', closeArtistPanel);

        // Barre de recherche principale
        const input    = document.getElementById('searchMainInput');
        const clearBtn = document.getElementById('searchClearBtn');

        input.addEventListener('input', function () {
            clearTimeout(searchDebounce);
            if (!this.value.trim()) { showDefaultView(); return; }
            searchDebounce = setTimeout(() => doSearch(this.value.trim()), 500);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && this.value.trim()) {
                clearTimeout(searchDebounce);
                doSearch(this.value.trim());
            }
            if (e.key === 'Escape') showDefaultView();
        });

        clearBtn.addEventListener('click', showDefaultView);
    });

    window.triggerSearch = triggerSearch;

})();
