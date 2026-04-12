// ============================================================
// SEARCH.JS — Artist & track search, artist profile panel
// Data sources: Last.fm + iTunes (via backend proxy)
//
// ARCHITECTURE
// ┌─────────────────────────────────────────────────┐
// │  DATA LAYER     openArtistPanel / loadDefaultView│
// │                 → fetch() calls to backend API  │
// ├─────────────────────────────────────────────────┤
// │  LOGIC LAYER    doSearch / triggerSearch        │
// │                 → state, search history, debounce│
// ├─────────────────────────────────────────────────┤
// │  UI LAYER       render* / show*View             │
// │                 → DOM manipulation only         │
// └─────────────────────────────────────────────────┘
// ============================================================

(function () {

    // ============================================================
    // DATA LAYER — API configuration & network calls
    // ============================================================

    const API_BASE = 'https://mvsiqva-api.onrender.com';

    // ==================== STATE ====================

    let isSearching    = false;     // Prevents concurrent searches (debounce guard)
    let previewAudio   = null;      // The currently playing Audio object (null if nothing plays)
    let previewBtn     = null;      // The DOM element of the currently playing row (for CSS class)
    let searchDebounce = null;      // Holds the setTimeout ID so we can cancel it on new keystrokes
    const HISTORY_KEY  = 'mvsiqva_search_history'; // localStorage key for search history

    // ==================== PAGE OPEN / CLOSE ====================

    // Called by player.js when the user clicks "Search" in the navbar
    window.openSearchPage = function () {
        window.navigateTo('search'); // Switch to search page via the central router
        setTimeout(() => document.getElementById('searchMainInput').focus(), 400); // Autofocus after CSS transition
        // Only load trending data once — dataset.loaded flag prevents duplicate API calls
        if (!document.getElementById('searchDefaultView').dataset.loaded) {
            loadDefaultView();
        }
    };

    // ============================================================
    // UI LAYER — DOM rendering, skeletons, views
    // ============================================================

    // ==================== DEFAULT VIEW (trending + history) ====================

    async function loadDefaultView() {
        const view = document.getElementById('searchDefaultView');
        view.dataset.loaded = '1'; // Mark as loaded so we don't fetch again on re-open

        renderHistory();
        renderDefaultSkeletons();

        try {
            // Promise.all runs both fetches simultaneously — faster than sequential await
            const [artistsRes, tracksRes] = await Promise.all([
                fetch(`${API_BASE}/api/search/trending/artists`),
                fetch(`${API_BASE}/api/search/trending/tracks`),
            ]);
            const artistsData = await artistsRes.json();
            const tracksData  = await tracksRes.json();
            renderTrendingArtists(artistsData.artists || []);
            renderTrendingTracks(tracksData.tracks   || []);
        } catch (e) {
            console.error('Trending load error:', e);
            const errHtml = `
                <div style="display:flex;flex-direction:column;align-items:center;gap:0.8vw;padding:2vw 0;text-align:center;">
                    <span style="font-size:2vw;">📡</span>
                    <p style="color:rgba(255,255,255,0.5);font-size:0.95vw;margin:0;">Could not reach the server.</p>
                    <p style="color:rgba(255,255,255,0.3);font-size:0.8vw;margin:0;">Check your connection and try again.</p>
                    <button onclick="window._searchRetry()" style="
                        margin-top:0.3vw;padding:0.5vw 1.8vw;
                        background:rgba(230,201,19,0.1);border:1px solid rgba(230,201,19,0.4);
                        color:rgb(230,201,19);border-radius:3vw;cursor:pointer;
                        font-size:0.85vw;font-family:inherit;">Retry</button>
                </div>`;
            document.getElementById('trendingArtistsWrap').innerHTML = errHtml;
            document.getElementById('trendingTracksWrap').innerHTML  = '';
            window._searchRetry = function () {
                const view = document.getElementById('searchDefaultView');
                delete view.dataset.loaded;
                loadDefaultView();
            };
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
        document.getElementById('trendingTracksWrap').innerHTML = tracks.map((t) => `
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

    // ============================================================
    // LOGIC LAYER — Search state, history, data processing
    // ============================================================

    // ==================== SEARCH ====================

    function triggerSearch(query) {
        const input = document.getElementById('searchMainInput');
        input.value = query;
        doSearch(query);
    }

    async function doSearch(query) {
        if (!query.trim() || isSearching) return; // Ignore empty queries or if already searching
        isSearching = true;

        addHistory(query);
        showResultsView();
        renderSearchSkeletons();

        try {
            // Both requests fire at the same time — results arrive together
            const [artistsRes, tracksRes] = await Promise.all([
                fetch(`${API_BASE}/api/search/artists?q=${encodeURIComponent(query)}`),
                fetch(`${API_BASE}/api/search/tracks?q=${encodeURIComponent(query)}`),
            ]);
            const artistsData = await artistsRes.json();
            const tracksData  = await tracksRes.json();
            renderSearchArtists(artistsData.artists || [], query);
            renderSearchTracks(tracksData.tracks   || [], query);
        } catch (e) {
            console.error('Search error:', e);
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
        document.getElementById('searchArtistsLabel').textContent = `Artists for "${query}"`;
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
        document.getElementById('searchTracksLabel').textContent = `Tracks for "${query}"`;
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

    // ==================== ARTIST PANEL ====================

    // Opens the artist panel sliding in from the right with biography and top 5 tracks
    window.openArtistPanel = async function (artistName) {
        stopPreview(); // Stop any playing preview before loading new content
        const panel = document.getElementById('artistPanel');
        panel.classList.add('active');
        renderArtistSkeleton();

        try {
            const res  = await fetch(`${API_BASE}/api/search/artist?name=${encodeURIComponent(artistName)}`);
            const data = await res.json();
            renderArtistPanel(data);
        } catch (e) {
            console.error('Artist panel error:', e);
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
                    ${listeners ? `<p class="artist-panel-listeners">${listeners} listeners</p>` : ''}
                </div>
            </div>
            ${bio ? `<p class="artist-panel-bio">${escHtml(bio)}</p>` : ''}
            <h3 class="artist-panel-section-title">Top 5 tracks</h3>
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

    // ==================== AUDIO PREVIEW ====================

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

    // ==================== VIEW SWITCHING ====================

    function showResultsView() {
        document.getElementById('searchDefaultView').style.display = 'none';
        document.getElementById('searchResultsView').style.display = 'block';
        document.getElementById('searchClearBtn').style.display    = 'flex';
    }

    function showDefaultView() {
        document.getElementById('searchDefaultView').style.display = 'block';
        document.getElementById('searchResultsView').style.display = 'none';
        document.getElementById('searchClearBtn').style.display    = 'none';
        document.getElementById('searchMainInput').value           = '';
        renderHistory();
    }

    // ==================== SEARCH HISTORY ====================

    function getHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
        catch { return []; }
    }

    function addHistory(query) {
        let h = getHistory().filter(q => q !== query); // Remove duplicate if already in history
        h.unshift(query); // Add the new query at the top of the list
        h = h.slice(0, 8); // Keep only the 8 most recent searches
        localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    }

    window.removeHistory = function (query) {
        const h = getHistory().filter(q => q !== query);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
        renderHistory();
    };

    // ==================== UTILS ====================

    // Escape user-generated strings before inserting them into HTML
    // Prevents XSS attacks (e.g. an artist name containing <script>)
    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    // escAttr is used inside HTML attribute values (e.g. onclick="openArtistPanel('...')")
    function escAttr(s) {
        return String(s).replace(/"/g,'&quot;');
    }

    // ==================== INIT ====================

    document.addEventListener('DOMContentLoaded', function () {

        // Sticky scroll effect — hero title fades when scrolling down
        const searchBody = document.querySelector('.search-body');
        const searchHero = document.querySelector('.search-hero');
        searchBody.addEventListener('scroll', function () {
            searchHero.classList.toggle('scrolled', this.scrollTop > 30);
        });

        // Close artist panel when clicking outside of it
        document.getElementById('searchPage').addEventListener('click', function(e) {
            const panel = document.getElementById('artistPanel');
            if (panel.classList.contains('active') &&
                !panel.contains(e.target) &&
                !e.target.closest('.artist-card')) {
                closeArtistPanel();
            }
        });

        // Close button inside the artist panel
        document.getElementById('artistPanelClose').addEventListener('click', closeArtistPanel);

        // Main search bar
        const input    = document.getElementById('searchMainInput');
        const clearBtn = document.getElementById('searchClearBtn');

        input.addEventListener('input', function () {
            clearTimeout(searchDebounce);
            if (!this.value.trim()) { showDefaultView(); return; }
            // Debounce: cancels and restarts the timer on every keystroke
            // Only triggers doSearch() if the user stops typing for 500ms
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