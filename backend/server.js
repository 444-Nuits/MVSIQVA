const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');

const app     = express();
const PORT    = process.env.PORT || 3000;
const LASTFM_KEY = process.env.LASTFM_KEY || '4d7ebbef5b0b9430cf28419a88af87da';

app.use(cors());

// ── Enrich a track with cover + preview from iTunes ──────────────
// Strategy:
//   1. Search iTunes with "title artist" → exact match
//   2. If no result, search with artist only → at least get a cover
async function enrichWithItunes(title, artist) {
    // Attempt 1: search by title + artist
    try {
        const query = encodeURIComponent(`${title} ${artist}`);
        const url   = `https://itunes.apple.com/search?term=${query}&media=music&entity=musicTrack&limit=3`;
        const res   = await fetch(url);
        const data  = await res.json();

        if (data.results && data.results.length > 0) {
            // Pick the result whose artist name is closest to ours
            const match = data.results.find(r =>
                r.artistName.toLowerCase().includes(artist.toLowerCase()) ||
                artist.toLowerCase().includes(r.artistName.toLowerCase())
            ) || data.results[0];

            return {
                cover:      match.artworkUrl100.replace('100x100', '300x300'),
                previewUrl: match.previewUrl || null,
                duration:   match.trackTimeMillis
                    ? `${Math.floor(match.trackTimeMillis / 60000)}:${String(Math.floor((match.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`
                    : null,
                album: match.collectionName || null,
            };
        }
    } catch (e) {}

    // Attempt 2: fallback — search by artist only to at least get a cover
    try {
        const query = encodeURIComponent(artist);
        const url   = `https://itunes.apple.com/search?term=${query}&media=music&entity=musicTrack&limit=1`;
        const res   = await fetch(url);
        const data  = await res.json();

        if (data.results && data.results.length > 0) {
            return {
                cover:      data.results[0].artworkUrl100.replace('100x100', '300x300'),
                previewUrl: null,   // no matching preview for this track
                duration:   null,
                album:      null,
            };
        }
    } catch (e) {}

    return { cover: null, previewUrl: null, duration: null, album: null };
}

// Enrich an array of tracks in parallel (max 5 at a time)
async function enrichAll(tracks) {
    const results   = [];
    const chunkSize = 5;
    for (let i = 0; i < tracks.length; i += chunkSize) {
        const chunk    = tracks.slice(i, i + chunkSize);
        const enriched = await Promise.all(
            chunk.map(t => enrichWithItunes(t.title, t.artist).then(extra => ({ ...t, ...extra })))
        );
        results.push(...enriched);
    }
    return results;
}

// ── Route: global top charts ─────────────────────────────────────
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
        res.status(500).json({ error: 'Last.fm error' });
    }
});

// ── Route: top by genre ──────────────────────────────────────────
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
        res.status(500).json({ error: 'Last.fm error' });
    }
});

// ── Route: search tracks ─────────────────────────────────────────
app.get('/api/charts/search', async function(req, res) {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing parameter: q' });

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
        res.status(500).json({ error: 'Last.fm error' });
    }
});

// ── Route: trending artists ──────────────────────────────────────
app.get('/api/search/trending/artists', async function(req, res) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${LASTFM_KEY}&format=json&limit=12`;
    try {
        const response = await fetch(url);
        const data     = await response.json();
        const artists  = await Promise.all(
            data.artists.artist.map(async (a) => {
                const img = await getArtistImageFromItunes(a.name);
                return {
                    name:      a.name,
                    listeners: parseInt(a.listeners).toLocaleString('fr-FR'),
                    image:     img,
                };
            })
        );
        res.json({ artists });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Last.fm error' });
    }
});

// ── Route: trending tracks ───────────────────────────────────────
app.get('/api/search/trending/tracks', async function(req, res) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${LASTFM_KEY}&format=json&limit=10`;
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
        res.status(500).json({ error: 'Last.fm error' });
    }
});

// ── Route: search artists ────────────────────────────────────────
app.get('/api/search/artists', async function(req, res) {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing parameter: q' });

    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=6`;
    try {
        const response = await fetch(url);
        const data     = await response.json();
        const list     = data.results.artistmatches.artist || [];
        const artists  = await Promise.all(
            list.map(async (a) => {
                const img = await getArtistImageFromItunes(a.name);
                return {
                    name:      a.name,
                    listeners: parseInt(a.listeners || 0).toLocaleString('fr-FR'),
                    image:     img,
                };
            })
        );
        res.json({ artists });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Artist search error' });
    }
});

// ── Route: search tracks ─────────────────────────────────────────
app.get('/api/search/tracks', async function(req, res) {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing parameter: q' });

    const url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=15`;
    try {
        const response = await fetch(url);
        const data     = await response.json();
        const tracks   = (data.results.trackmatches.track || []).map((t, i) => ({
            rank:   i + 1,
            title:  t.name,
            artist: t.artist,
        }));
        const enriched = await enrichAll(tracks);
        res.json({ tracks: enriched });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Track search error' });
    }
});

// ── Route: artist profile (bio + top 5 + image) ──────────────────
app.get('/api/search/artist', async function(req, res) {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Missing parameter: name' });

    try {
        const infoUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${LASTFM_KEY}&format=json&lang=en`;
        const topUrl  = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(name)}&api_key=${LASTFM_KEY}&format=json&limit=5`;

        const [infoRes, topRes] = await Promise.all([fetch(infoUrl), fetch(topUrl)]);
        const infoData = await infoRes.json();
        const topData  = await topRes.json();

        // Clean bio
        let bio = '';
        const rawBio = infoData.artist?.bio?.summary || '';
        bio = rawBio.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const cutIdx = bio.indexOf('Read more');
        if (cutIdx > -1) bio = bio.substring(0, cutIdx).trim();
        if (bio.length > 400) bio = bio.substring(0, 400) + '…';

        const listeners = infoData.artist?.stats?.listeners
            ? parseInt(infoData.artist.stats.listeners).toLocaleString('fr-FR')
            : null;

        const image = await getArtistImageFromItunes(name);

        const rawTracks = (topData.toptracks?.track || []).map((t, i) => ({
            rank:   i + 1,
            title:  t.name,
            artist: name,
        }));
        const tracks = await enrichAll(rawTracks);

        res.json({ name, bio, image, listeners, tracks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Artist profile error' });
    }
});

// ── Helper: get artist image (Last.fm first, iTunes fallback) ─────
async function getArtistImageFromItunes(artistName) {
    // 1. Try Last.fm first (actual artist photo)
    try {
        const url  = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_KEY}&format=json`;
        const res  = await fetch(url);
        const data = await res.json();
        const images = data.artist?.image || [];
        const large  = images.find(img => img.size === 'extralarge');
        if (large && large['#text'] && large['#text'].length > 0) {
            return large['#text'];
        }
    } catch (e) {}

    // 2. Fallback: iTunes album artwork
    try {
        const url  = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=musicTrack&limit=1`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return (data.results[0].artworkUrl100 || '').replace('100x100', '300x300');
        }
    } catch (e) {}

    return null;
}

app.listen(PORT, function() {
    console.log('Server running on http://localhost:' + PORT);
});