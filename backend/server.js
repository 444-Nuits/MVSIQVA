// ============================================================
// SERVER.JS — Node.js + Express backend API
//
// This file acts as a proxy between the frontend and two
// external APIs (Last.fm and iTunes). It exists for two reasons:
//   1. Hide the Last.fm API key from the browser (security)
//   2. Combine data from two APIs into a single JSON response
//
// ARCHITECTURE
// ┌─────────────────────────────────────────────────┐
// │  DATA LAYER     enrichWithItunes / enrichAll    │
// │                 → HTTP calls to Last.fm & iTunes│
// ├─────────────────────────────────────────────────┤
// │  LOGIC LAYER    getArtistImageFromItunes        │
// │                 → image selection with fallback │
// ├─────────────────────────────────────────────────┤
// │  API ROUTES     app.get('/api/...')             │
// │                 → REST endpoints for the frontend│
// └─────────────────────────────────────────────────┘
// ============================================================

// Import required Node.js packages
const express = require('express'); // Web framework to create REST routes
const cors    = require('cors');    // Allows the frontend (different origin) to call this API
const fetch   = require('node-fetch'); // HTTP client to call external APIs (Last.fm, iTunes)

const app  = express();
const PORT = process.env.PORT || 3000; // Use Render's port in production, 3000 locally

// API key stored as an environment variable — never hardcoded in source code
// Set via Render dashboard: Environment → LASTFM_KEY
const LASTFM_KEY = process.env.LASTFM_KEY;

// Allow all cross-origin requests (needed because frontend and backend are on different domains)
app.use(cors());

// iTunes blocks requests that don't look like a real browser — this header spoofs one
const ITUNES_HEADERS = {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
};

// ============================================================
// DATA LAYER — Track enrichment via iTunes (cover art, preview, duration)
//
// Last.fm gives us track titles and artists, but no cover art
// or audio previews. iTunes fills that gap.
// Strategy:
//   1. Search iTunes with "title + artist" → best match
//   2. If no result, search by artist only → at least get a cover
// ============================================================

async function enrichWithItunes(title, artist) {

    // --- Attempt 1: search by title + artist (most accurate) ---
    try {
        const query = encodeURIComponent(`${title} ${artist}`); // URL-encode the search string
        const url   = `https://itunes.apple.com/search?term=${query}&media=music&entity=musicTrack&limit=3`;
        const res   = await fetch(url, ITUNES_HEADERS);
        const data  = await res.json();

        if (data.results && data.results.length > 0) {
            // Among the results, prefer the one whose artist name matches ours
            // This avoids returning a cover from a wrong artist with the same song title
            const match = data.results.find(r =>
                r.artistName.toLowerCase().includes(artist.toLowerCase()) ||
                artist.toLowerCase().includes(r.artistName.toLowerCase())
            ) || data.results[0]; // Fall back to first result if no name match

            return {
                // Replace the small thumbnail (100x100) with a higher resolution version (300x300)
                cover:      match.artworkUrl100.replace('100x100', '300x300'),
                previewUrl: match.previewUrl || null, // 30-second audio clip URL (may be null)
                // Convert milliseconds to "m:ss" format
                duration:   match.trackTimeMillis
                    ? `${Math.floor(match.trackTimeMillis / 60000)}:${String(Math.floor((match.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`
                    : null,
                album: match.collectionName || null, // Album name
            };
        }
    } catch (e) {} // Silently ignore errors — fallback below will handle it

    // --- Attempt 2: search by artist only (cover art fallback) ---
    try {
        const query = encodeURIComponent(artist);
        const url   = `https://itunes.apple.com/search?term=${query}&media=music&entity=musicTrack&limit=1`;
        const res   = await fetch(url, ITUNES_HEADERS);
        const data  = await res.json();

        if (data.results && data.results.length > 0) {
            return {
                cover:      data.results[0].artworkUrl100.replace('100x100', '300x300'),
                previewUrl: null,  // No matching preview since we didn't find the exact track
                duration:   null,
                album:      null,
            };
        }
    } catch (e) {}

    // If both attempts fail, return empty values so the frontend can handle missing data gracefully
    return { cover: null, previewUrl: null, duration: null, album: null };
}

// Enrich a list of tracks in batches of 5 to avoid hitting iTunes rate limits
async function enrichAll(tracks) {
    const results   = [];
    const chunkSize = 5; // Process 5 tracks in parallel at a time

    for (let i = 0; i < tracks.length; i += chunkSize) {
        const chunk = tracks.slice(i, i + chunkSize); // Take the next 5 tracks

        // Enrich all 5 tracks simultaneously using Promise.all
        // then() merges the iTunes data into the original track object with spread operator
        const enriched = await Promise.all(
            chunk.map(t => enrichWithItunes(t.title, t.artist).then(extra => ({ ...t, ...extra })))
        );
        results.push(...enriched); // Add the enriched batch to the final results
    }
    return results;
}

// ============================================================
// API ROUTES — REST endpoints exposed to the frontend
// Each route fetches from Last.fm, then enriches with iTunes
// ============================================================

// GET /api/charts/top — Global top tracks (not genre-specific)
app.get('/api/charts/top', async function(req, res) {
    // Cap the limit at 50 to avoid overloading the API
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    const url   = `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${LASTFM_KEY}&format=json&limit=${limit}`;

    try {
        const response = await fetch(url);
        const data     = await response.json();
        // Map raw Last.fm objects to a clean, consistent format
        const tracks   = data.tracks.track.map((t, i) => ({
            rank:      i + 1,
            title:     t.name,
            artist:    t.artist.name,
            listeners: parseInt(t.listeners).toLocaleString('fr-FR'), // Format number with spaces
            playcount: parseInt(t.playcount).toLocaleString('fr-FR'),
        }));
        const enriched = await enrichAll(tracks); // Add cover art + previews from iTunes
        res.json({ tracks: enriched });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Last.fm error' }); // Return a clean error to the frontend
    }
});

// GET /api/charts/genre/:genre — Top tracks filtered by music genre (e.g. hip-hop, pop)
app.get('/api/charts/genre/:genre', async function(req, res) {
    const genre = req.params.genre; // Genre comes from the URL path parameter
    const limit = Math.min(parseInt(req.query.limit) || 25, 50);
    // Last.fm uses "tags" to represent genres — same concept, different name
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

// GET /api/charts/search?q= — Search tracks by keyword (used in the Charts page search bar)
app.get('/api/charts/search', async function(req, res) {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing parameter: q' }); // Validate input

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

// GET /api/search/trending/artists — Top 12 globally trending artists (Search page default view)
app.get('/api/search/trending/artists', async function(req, res) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${LASTFM_KEY}&format=json&limit=12`;
    try {
        const response = await fetch(url);
        const data     = await response.json();
        // For each artist, fetch their image separately (Last.fm images are often missing)
        const artists  = await Promise.all(
            data.artists.artist.map(async (a) => {
                const img = await getArtistImageFromItunes(a.name); // Try Last.fm first, iTunes fallback
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

// GET /api/search/trending/tracks — Top 10 globally trending tracks (Search page default view)
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
        const enriched = await enrichAll(tracks); // Add cover art + previews
        res.json({ tracks: enriched });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Last.fm error' });
    }
});

// GET /api/search/artists?q= — Search artists by name (used in the Search page)
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

// GET /api/search/tracks?q= — Search tracks by keyword (used in the Search page)
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

// GET /api/search/artist?name= — Full artist profile: bio + top 5 tracks + image
// This route powers the artist panel that slides in from the right on the Search page
app.get('/api/search/artist', async function(req, res) {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Missing parameter: name' });

    try {
        // Fetch artist info and top tracks simultaneously (faster than sequential calls)
        const infoUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${LASTFM_KEY}&format=json&lang=en`;
        const topUrl  = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(name)}&api_key=${LASTFM_KEY}&format=json&limit=5`;

        const [infoRes, topRes] = await Promise.all([fetch(infoUrl), fetch(topUrl)]);
        const infoData = await infoRes.json();
        const topData  = await topRes.json();

        // Clean the biography: Last.fm bio contains HTML tags and "Read more" links
        let bio = '';
        const rawBio = infoData.artist?.bio?.summary || '';
        bio = rawBio.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); // Strip HTML tags
        const cutIdx = bio.indexOf('Read more');
        if (cutIdx > -1) bio = bio.substring(0, cutIdx).trim(); // Remove "Read more on Last.fm"
        if (bio.length > 400) bio = bio.substring(0, 400) + '…'; // Truncate long bios

        // Format listener count as a readable number
        const listeners = infoData.artist?.stats?.listeners
            ? parseInt(infoData.artist.stats.listeners).toLocaleString('fr-FR')
            : null;

        // Get the artist's image (Last.fm → iTunes fallback)
        const image = await getArtistImageFromItunes(name);

        // Get top 5 tracks and enrich them with cover art + previews from iTunes
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

// ============================================================
// LOGIC LAYER — Artist image selection (Last.fm → iTunes fallback)
//
// Last.fm used to provide artist images but deprecated this feature.
// We try Last.fm first (it occasionally still works), then fall back
// to iTunes album artwork as a reliable alternative.
// ============================================================

async function getArtistImageFromItunes(artistName) {

    // --- Step 1: Try Last.fm (real artist photo when available) ---
    try {
        const url  = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_KEY}&format=json`;
        const res  = await fetch(url);
        const data = await res.json();
        const images = data.artist?.image || []; // Last.fm returns an array of image sizes
        const large  = images.find(img => img.size === 'extralarge'); // We want the biggest one
        // Only return if the URL is non-empty (Last.fm often returns empty strings)
        if (large && large['#text'] && large['#text'].length > 0) {
            return large['#text'];
        }
    } catch (e) {}

    // --- Step 2: Fallback — use iTunes album artwork as artist image ---
    try {
        const url  = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=musicTrack&limit=1`;
        const res  = await fetch(url, ITUNES_HEADERS);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            // Upgrade from thumbnail (100x100) to higher resolution (300x300)
            return (data.results[0].artworkUrl100 || '').replace('100x100', '300x300');
        }
    } catch (e) {}

    return null; // No image found — frontend will show a placeholder initial instead
}

// Start the HTTP server and listen on the configured port
app.listen(PORT, function() {
    console.log('Server running on http://localhost:' + PORT);
});