// ============================================================
// CHARTS.JS — Classement Last.fm + pochettes iTunes via backend
// ============================================================

(function () {

    // ==================== CONFIG ====================

    // En local → http://localhost:3000
    // Une fois déployé sur Railway → remplacer par l'URL Railway
    const API_BASE = 'http://https://mvsiqva-api.onrender.com:3000';

    // ==================== ÉTAT ====================

    let isLoading            = false;
    let currentGenre         = 'hip-hop';
    let currentQuery         = '';
    let previewAudio         = null;
    let currentlyPlayingBtn  = null;

    // ==================== OUVERTURE / FERMETURE ====================

    window.openChartsPage = function () {
        const page = document.getElementById('chartsPage');
        if (!page) return;
        page.classList.add('active');
        document.body.classList.add('page-open');

        if (document.getElementById('chartsTableBody').children.length === 0) {
            fetchGenre(currentGenre);
        }
    };

    window.closeChartsPage = function () {
    const page = document.getElementById('chartsPage');
    if (!page) return;
    stopPreview();

    // Slide vers le bas avant de retirer active
    page.style.transform = 'translateY(100vh)';

    setTimeout(function () {
        page.classList.remove('active');
        page.style.transform = ''; // Réinitialise pour la prochaine ouverture
    }, 800); // Correspond à la durée de transition de vos autres pages (0.8s)
};

    // ==================== APPELS BACKEND ====================

    async function fetchGenre(genre) {
        currentGenre = genre;
        currentQuery = '';
        document.getElementById('chartsSearchInput').value = '';
        updateGenreButtons();
        await loadTracks(`${API_BASE}/api/charts/genre/${encodeURIComponent(genre)}?limit=25`);
    }

    async function fetchSearch(query) {
        if (!query.trim()) return;
        currentQuery = query;
        updateGenreButtons();
        await loadTracks(`${API_BASE}/api/charts/search?q=${encodeURIComponent(query)}`);
    }

    async function loadTracks(url) {
        if (isLoading) return;
        isLoading = true;
        stopPreview();
        showSkeletons();

        try {
            const res  = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            renderTracks(data.tracks || []);
        } catch (err) {
            console.error('Erreur backend :', err);
            renderError();
        } finally {
            isLoading = false;
        }
    }

    // ==================== RENDU DU TABLEAU ====================

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
                        <button class="preview-btn" data-preview="${escAttr(t.previewUrl)}" title="Écouter 30s">
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
                    ${t.listeners
                        ? `<div class="charts-listeners">${t.listeners} auditeurs</div>`
                        : ''
                    }
                    ${t.duration
                        ? `<div class="charts-duration">${t.duration}</div>`
                        : ''
                    }
                </td>
            </tr>`;
        }).join('');

        // Événements preview
        tbody.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePreview(btn);
            });
        });
    }

    // ==================== PREVIEW AUDIO ====================

    function togglePreview(btn) {
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

    // ==================== ÉTATS UI ====================

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
                Impossible de contacter le serveur.<br>
                <span style="font-size:0.85vw;opacity:0.6;">Vérifiez que <code>node server.js</code> tourne.</span>
            </p>
            <button onclick="fetchGenre('${currentGenre}')" style="
                margin-top:1vw;padding:0.7vw 2vw;
                background:rgba(230,201,19,0.1);border:1px solid rgba(230,201,19,0.4);
                color:rgb(230,201,19);border-radius:3vw;cursor:pointer;
                font-size:0.9vw;font-family:inherit;">Réessayer</button>`;
    }

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

        // Bouton retour
        const backBtn = document.getElementById('chartsBackBtn');
        if (backBtn) backBtn.addEventListener('click', window.closeChartsPage);

        // Boutons genre
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', () => fetchGenre(btn.dataset.genre));
        });

        // Recherche
        const searchInput = document.getElementById('chartsSearchInput');
        const searchBtn   = document.getElementById('chartsSearchBtn');
        let   debounce;

        searchInput.addEventListener('input', function () {
            clearTimeout(debounce);
            if (!this.value.trim()) { fetchGenre(currentGenre); return; }
            debounce = setTimeout(() => fetchSearch(this.value.trim()), 600);
        });

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && this.value.trim()) fetchSearch(this.value.trim());
        });

        searchBtn.addEventListener('click', () => {
            if (searchInput.value.trim()) fetchSearch(searchInput.value.trim());
        });

        // Lien depuis worldPage
        const worldBtn = document.getElementById('worldChartsBtn');
        if (worldBtn) worldBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.openChartsPage();
        });
    });

    // Exposer pour les boutons inline
    window.fetchGenre  = fetchGenre;
    window.fetchSearch = fetchSearch;

})();