// ============================================================
// CHARTS.JS — Music charts powered by Last.fm + iTunes
//
// ARCHITECTURE
// ┌─────────────────────────────────────────────────┐
// │  DATA LAYER     fetchGenre / fetchSearch        │
// │                 → fetch() calls to backend API  │
// ├─────────────────────────────────────────────────┤
// │  LOGIC LAYER    loadTracks / togglePreview      │
// │                 → state management, audio       │
// ├─────────────────────────────────────────────────┤
// │  UI LAYER       renderTracks / showSkeletons    │
// │                 → DOM manipulation only         │
// └─────────────────────────────────────────────────┘
// ============================================================

(function () {

    // ============================================================
    // DATA LAYER — API configuration & network calls
    // ============================================================

    const API_BASE = 'https://mvsiqva-api.onrender.com';

    // ==================== STATE ====================

    let isLoading           = false; // Prevents duplicate fetch calls while data is loading
    let currentGenre        = 'hip-hop'; // The currently selected genre filter (default on open)
    let currentQuery        = '';        // Non-empty when a search query overrides the genre filter
    let previewAudio        = null;      // Currently playing Audio object
    let currentlyPlayingBtn = null;      // DOM button element of the playing row

    // ==================== PAGE OPEN / CLOSE ====================

    window.openChartsPage = function () {
        const page = document.getElementById('chartsPage');
        if (!page) return;
        page.classList.add('active');
        document.body.classList.add('page-open');

        // Only load data on first open — children.length === 0 means no rows yet
        if (document.getElementById('chartsTableBody').children.length === 0) {
            fetchGenre(currentGenre);
        }
    };

    window.closeChartsPage = function () {
        const page = document.getElementById('chartsPage');
        if (!page) return;
        stopPreview();

        // Animate the page sliding down before removing it from the DOM flow
        page.style.transform = 'translateY(100vh)';
        setTimeout(function () {
            page.classList.remove('active');
            page.style.transform = '';
        }, 800);
    };

    // ============================================================
    // LOGIC LAYER — Data loading, state, audio preview
    // ============================================================

    // ==================== BACKEND CALLS ====================

    // Fetch tracks for a specific genre and reset the search bar
    async function fetchGenre(genre) {
        currentGenre = genre;
        currentQuery = ''; // Clear any active search query
        document.getElementById('chartsSearchInput').value = '';
        updateGenreButtons(); // Highlight the correct genre button
        await loadTracks(`${API_BASE}/api/charts/genre/${encodeURIComponent(genre)}?limit=25`);
    }

    // Fetch tracks matching a search query (overrides the genre filter)
    async function fetchSearch(query) {
        if (!query.trim()) return; // Ignore empty searches
        currentQuery = query;
        updateGenreButtons(); // Deactivate all genre buttons while in search mode
        await loadTracks(`${API_BASE}/api/charts/search?q=${encodeURIComponent(query)}`);
    }

    async function loadTracks(url) {
        if (isLoading) return;
        isLoading = true;
        stopPreview();
        showSkeletons();

        try {
            const res  = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`); // Treat non-200 responses as errors
            const data = await res.json();
            renderTracks(data.tracks || []);
        } catch (err) {
            console.error('Backend error:', err);
            renderError();
        } finally {
            isLoading = false;
        }
    }

    // ============================================================
    // UI LAYER — DOM rendering, skeletons, visual states
    // ============================================================

    // ==================== TABLE RENDERING ====================

    function renderTracks(tracks) {
        const tbody     = document.getElementById('chartsTableBody');
        const empty     = document.getElementById('chartsEmpty');
        const tableWrap = document.getElementById('chartsTableWrap');

        if (!tracks.length) {
            tbody.innerHTML         = '';
            empty.style.display     = 'flex';
            tableWrap.style.display = 'none';
            return;
        }

        empty.style.display     = 'none';
        tableWrap.style.display = 'block';

        tbody.innerHTML = tracks.map((t) => {
            const hasPreview = !!t.previewUrl;
            const cover      = t.cover || '';
            const rankClass  = t.rank <= 3 ? `rank-top rank-${t.rank}` : '';

            return `
            <tr class="charts-row">
                <td class="charts-rank">
                    <span class="rank-num ${rankClass}">${t.rank}</span>
                </td>
                <td class="charts-cover-cell">
                    <div class="charts-cover-wrap">
                        ${cover
                            ? `<img src="${cover}" alt="${escHtml(t.title)}" loading="lazy">`
                            : `<div class="charts-cover-placeholder"></div>`
                        }
                        ${hasPreview ? `
                        <button class="preview-btn" data-preview="${escAttr(t.previewUrl)}" title="Listen 30s">
                            <svg class="icon-play"  width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                            <svg class="icon-pause" width="12" height="12" viewBox="0 0 24 24" fill="white" style="display:none"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                        </button>` : ''}
                    </div>
                </td>
                <td class="charts-info-cell">
                    <div class="charts-track-name">${escHtml(t.title)}</div>
                    <div class="charts-artist-name">${escHtml(t.artist)}</div>
                </td>
                <td class="charts-album-cell">
                    <div class="charts-album-name">${escHtml(t.album || '—')}</div>
                </td>
                <td class="charts-meta-cell">
                    ${t.listeners ? `<div class="charts-listeners">${t.listeners} listeners</div>` : ''}
                    ${t.duration  ? `<div class="charts-duration">${t.duration}</div>` : ''}
                </td>
            </tr>`;
        }).join('');

        // Event listeners must be attached after innerHTML is set — they can't be inline
        // because the buttons didn't exist in the DOM before renderTracks() ran
        tbody.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePreview(btn);
            });
        });
    }

    // ==================== AUDIO PREVIEW ====================

    function togglePreview(btn) {
        // If clicking the same button again, stop playback instead of restarting
        if (currentlyPlayingBtn === btn) { stopPreview(); return; }
        stopPreview();

        previewAudio        = new Audio(btn.dataset.preview);
        currentlyPlayingBtn = btn;
        btn.querySelector('.icon-play').style.display  = 'none';
        btn.querySelector('.icon-pause').style.display = 'block';
        btn.classList.add('playing');
        previewAudio.play().catch(() => {});
        previewAudio.addEventListener('ended', stopPreview);
    }

    function stopPreview() {
        if (previewAudio) { previewAudio.pause(); previewAudio = null; }
        if (currentlyPlayingBtn) {
            currentlyPlayingBtn.querySelector('.icon-play').style.display  = 'block';
            currentlyPlayingBtn.querySelector('.icon-pause').style.display = 'none';
            currentlyPlayingBtn.classList.remove('playing');
            currentlyPlayingBtn = null;
        }
    }

    // ==================== UI STATES ====================

    function showSkeletons() {
        const tbody     = document.getElementById('chartsTableBody');
        const tableWrap = document.getElementById('chartsTableWrap');
        const empty     = document.getElementById('chartsEmpty');
        empty.style.display     = 'none';
        tableWrap.style.display = 'block';
        tbody.innerHTML = Array.from({ length: 10 }, () => `
            <tr class="charts-row">
                <td class="charts-rank"><span class="skeleton-block" style="width:20px;height:18px;border-radius:4px;display:block;margin:auto;"></span></td>
                <td class="charts-cover-cell"><div class="charts-cover-wrap skeleton-block"></div></td>
                <td class="charts-info-cell">
                    <div class="skeleton-block" style="width:55%;height:13px;border-radius:4px;margin-bottom:6px;"></div>
                    <div class="skeleton-block" style="width:35%;height:11px;border-radius:4px;"></div>
                </td>
                <td class="charts-album-cell"><div class="skeleton-block" style="width:65%;height:11px;border-radius:4px;"></div></td>
                <td class="charts-meta-cell"><div class="skeleton-block" style="width:70px;height:11px;border-radius:4px;"></div></td>
            </tr>`).join('');
    }

    function renderError() {
        const tableWrap = document.getElementById('chartsTableWrap');
        const empty     = document.getElementById('chartsEmpty');
        tableWrap.style.display = 'none';
        empty.style.display     = 'flex';
        empty.innerHTML = `
            <span style="font-size:2.5vw;">📡</span>
            <p style="color:rgba(255,255,255,0.5);font-size:1.1vw;margin-top:1vw;">
                Could not reach the server.<br>
                <span style="font-size:0.85vw;opacity:0.6;">Make sure the backend is running.</span>
            </p>
            <button onclick="fetchGenre('${currentGenre}')" style="
                margin-top:1vw;padding:0.7vw 2vw;
                background:rgba(230,201,19,0.1);border:1px solid rgba(230,201,19,0.4);
                color:rgb(230,201,19);border-radius:3vw;cursor:pointer;
                font-size:0.9vw;font-family:inherit;">Retry</button>`;
    }

    // Highlight only the active genre button; deactivate all when a search query is active
    function updateGenreButtons() {
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.classList.toggle('active', !currentQuery && btn.dataset.genre === currentGenre);
        });
    }

    // ==================== UTILS ====================

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function escAttr(s) {
        return String(s).replace(/"/g,'&quot;');
    }

    // ==================== INIT ====================

    document.addEventListener('DOMContentLoaded', function () {

        // Back button
        const backBtn = document.getElementById('chartsBackBtn');
        if (backBtn) backBtn.addEventListener('click', window.closeChartsPage);

        // Genre filter buttons
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', () => fetchGenre(btn.dataset.genre));
        });

        // Search input with debounce
        const searchInput = document.getElementById('chartsSearchInput');
        const searchBtn   = document.getElementById('chartsSearchBtn');
        let   debounce; // Holds setTimeout ID for debouncing keystrokes

        searchInput.addEventListener('input', function () {
            clearTimeout(debounce); // Cancel the previous timer on each keystroke
            if (!this.value.trim()) { fetchGenre(currentGenre); return; } // Reset to genre on clear
            debounce = setTimeout(() => fetchSearch(this.value.trim()), 600); // Wait 600ms before searching
        });

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && this.value.trim()) fetchSearch(this.value.trim());
        });

        searchBtn.addEventListener('click', () => {
            if (searchInput.value.trim()) fetchSearch(searchInput.value.trim());
        });

        // Link from the World page
        const worldBtn = document.getElementById('worldChartsBtn');
        if (worldBtn) worldBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.openChartsPage();
        });
    });

    // These are called from onclick attributes in renderError() HTML strings
    window.fetchGenre  = fetchGenre;
    window.fetchSearch = fetchSearch;

})();