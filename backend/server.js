    const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');

const app     = express();
const PORT    = 3000;
const LASTFM_KEY = '4d7ebbef5b0b9430cf28419a88af87da'; // ← votre clé Last.fm

app.use(cors());

// Enrichit un titre avec pochette + preview iTunes
async function enrichWithItunes(title, artist) {
    try {
        const query = encodeURIComponent(`${title} ${artist}`);
        const url   = `https://itunes.apple.com/search?term=${query}&media=music&entity=musicTrack&limit=1`;
        const res   = await fetch(url);
        const data  = await res.json();
        if (data.results && data.results.length > 0) {
            const t = data.results[0];
            return {
                cover:      t.artworkUrl100,
                previewUrl: t.previewUrl || null,
                duration:   t.trackTimeMillis
                    ? `${Math.floor(t.trackTimeMillis/60000)}:${String(Math.floor((t.trackTimeMillis%60000)/1000)).padStart(2,'0')}`
                    : null,
                album:      t.collectionName || null,
            };
        }
    } catch (e) {}
    return { cover: null, previewUrl: null, duration: null, album: null };
}

// Enrichit un tableau de tracks (en parallèle, max 5 à la fois)
async function enrichAll(tracks) {
    const results = [];
    const chunkSize = 5;
    for (let i = 0; i < tracks.length; i += chunkSize) {
        const chunk = tracks.slice(i, i + chunkSize);
        const enriched = await Promise.all(
            chunk.map(t => enrichWithItunes(t.title, t.artist).then(extra => ({ ...t, ...extra })))
        );
        results.push(...enriched);
    }
    return results;
}

// ── Route : top global ──────────────────────────────────────
app.get('/api/charts/top', async function(req, res) {
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const url   = `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${LASTFM_KEY}&format=json&limit=${limit}`;

    try {
        const response = await fetch(url);
        const data     = await response.json();
        const tracks   = data.tracks.track.map((t, i) => ({
            rank:      i + 1,
            title:     t.name,
            artist:    t.artist.name,
            listeners: parseInt(t.listeners).toLocaleString('fr-FR'),
            playcount: parseInt(t.playcount).toLocaleString('fr-FR'),
        }));
        const enriched = await enrichAll(tracks);
        res.json({ tracks: enriched });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur Last.fm' });
    }
});

// ── Route : top par genre ───────────────────────────────────
app.get('/api/charts/genre/:genre', async function(req, res) {
    const genre = req.params.genre;
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const url   = `https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(genre)}&api_key=${LASTFM_KEY}&format=json&limit=${limit}`;

    try {
        const response = await fetch(url);
        const data     = await response.json();
        const tracks   = data.tracks.track.map((t, i) => ({
            rank:   i + 1,
            title:  t.name,
            artist: t.artist.name,
        }));
        const enriched = await enrichAll(tracks);
        res.json({ tracks: enriched });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur Last.fm' });
    }
});

// ── Route : recherche ───────────────────────────────────────
app.get('/api/charts/search', async function(req, res) {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Paramètre q manquant' });

    const url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=25`;

    try {
        const response = await fetch(url);
        const data     = await response.json();
        const tracks   = data.results.trackmatches.track.map((t, i) => ({
            rank:      i + 1,
            title:     t.name,
            artist:    t.artist,
            listeners: parseInt(t.listeners).toLocaleString('fr-FR'),
        }));
        const enriched = await enrichAll(tracks);
        res.json({ tracks: enriched });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur Last.fm' });
    }
});

app.listen(PORT, function() {
    console.log('Serveur lancé sur http://localhost:' + PORT);
});