# MVSIQVA

> A music discovery web application — explore trending tracks, search artists, browse charts by genre, and discover music news.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-black?style=for-the-badge&logo=github)](https://netestia-my.sharepoint.com/:v:/r/personal/victor_bosshard_etu_estia_fr/Documents/Documents/COURS%20-%20ESTIA/ING%202A/Semestre%208%20-%20SAVIONIA%20-%20KUOPIO/COURS/Browser%20Programming/MVSIQVA.mp4?csf=1&web=1&e=2Le81J&nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://mvsiqva-api.onrender.com)

---

## Live Demo

**→ [https://444-nuits.github.io/MVSIQVA/](https://netestia-my.sharepoint.com/:v:/r/personal/victor_bosshard_etu_estia_fr/Documents/Documents/COURS%20-%20ESTIA/ING%202A/Semestre%208%20-%20SAVIONIA%20-%20KUOPIO/COURS/Browser%20Programming/MVSIQVA.mp4?csf=1&web=1&e=2Le81J&nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D)**

Backend API: `https://mvsiqva-api.onrender.com`

---

## Project Description

MVSIQVA is a web application for discovering and visualising music data. Users can:

- Browse **global and genre-specific charts** (Hip-Hop, Pop, Rock, Electronic, R&B…)
- **Search artists and tracks** with real-time results
- View **artist profiles** with biography, listener count, and top 5 tracks
- Preview **30-second audio clips** directly in the browser
- Read **music news** filtered by category
- Explore a **social feed** of musical events and posts

Data is fetched live from two public REST APIs: **Last.fm** (artist & track metadata) and **iTunes** (cover art, audio previews, durations).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     FRONTEND                        │
│              GitHub Pages (static)                  │
│                                                     │
│  index.html      →  App shell & navigation          │
│  player.js       →  Audio player & page routing     │
│  search.js       →  Search, trending, artist panel  │
│  charts.js       →  Charts by genre & search        │
│  news.js         →  News feed & article modal       │
│  social.js       →  Social feed                     │
│  auth.js         →  Login / Register UI             │
│  profile.js      →  User profile page               │
│  about.js        →  About & newsletter              │
│  style.css       →  Global styles & responsive      │
└───────────────────┬─────────────────────────────────┘
                    │  fetch() — HTTPS requests
                    ▼
┌─────────────────────────────────────────────────────┐
│                     BACKEND                         │
│            Node.js + Express (Render)               │
│                                                     │
│  GET /api/charts/top          →  Global top tracks  │
│  GET /api/charts/genre/:genre →  Tracks by genre    │
│  GET /api/search/artists      →  Search artists     │
│  GET /api/search/tracks       →  Search tracks      │
│  GET /api/search/artist       →  Artist profile     │
│  GET /api/search/trending/*   →  Trending content   │
└───────────┬────────────────────────┬────────────────┘
            │                        │
            ▼                        ▼
┌─────────────────┐      ┌──────────────────────────┐
│    Last.fm API  │      │       iTunes API          │
│  (metadata,     │      │  (cover art, previews,    │
│   biographies,  │      │   durations, albums)      │
│   listener data)│      │                           │
└─────────────────┘      └──────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   LOCAL DATA                        │
│  news.json   →  Music news articles (mock data)     │
│  users.json  →  User data structure reference       │
└─────────────────────────────────────────────────────┘
```

### Separation of concerns

| Layer | Responsibility | Files |
|---|---|---|
| **UI** | Structure, layout, styles | `index.html`, `style.css` |
| **Application logic** | Page routing, events, DOM manipulation | `player.js`, `auth.js`, `profile.js` |
| **Data handling** | API calls, data formatting, state | `search.js`, `charts.js`, `news.js` |

---

## Technologies

### Frontend
| Technology | Usage |
|---|---|
| HTML5 (semantic) | App structure — `<header>`, `<nav>`, `<section>`, `<footer>` |
| CSS3 | Responsive layout, animations, custom properties |
| Vanilla JavaScript (ES6+) | DOM manipulation, async/await, event handling |
| Web Audio API | 30-second track preview playback |
| LocalStorage | Search history persistence |

### Backend
| Technology | Usage |
|---|---|
| Node.js | Runtime environment |
| Express.js | REST API routing |
| node-fetch | HTTP requests to external APIs |
| CORS | Cross-origin request handling |

### External APIs
| API | Usage | Type |
|---|---|---|
| [Last.fm API](https://www.last.fm/api) | Track metadata, artist info, charts, biographies | Public REST API |
| [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) | Cover art, audio previews, durations | Public REST API |

### Hosting & Deployment
| Service | Usage |
|---|---|
| GitHub Pages | Frontend static hosting |
| Render | Backend Node.js hosting |

### Local mock data
`news.json` is used as a local mock data source for the news feed. This approach was chosen because no suitable free public API provides music-specific news with the required structure and reliability. The data is structured as a REST-like JSON array and consumed via `fetch()` to match the project's asynchronous data-handling pattern.

---

## Setup Instructions

### Prerequisites
- Node.js v18+
- npm

### Run the backend locally

```bash
# Clone the repository
git clone https://github.com/444-nuits/MVSIQVA.git
cd MVSIQVA

# Install dependencies
npm install

# Set your Last.fm API key as an environment variable
export LASTFM_KEY=your_api_key_here   # Linux/macOS
set LASTFM_KEY=your_api_key_here      # Windows

# Start the server
npm start
# → Server running on http://localhost:3000
```

### Run the frontend locally

Open `index.html` directly in your browser, or use a local server:

```bash
npx serve .
```

> **Note:** By default, the frontend points to the deployed Render backend (`https://mvsiqva-api.onrender.com`). To use your local backend, update the `API_BASE` constant in `search.js` and `charts.js`.

---

## AI Usage Disclosure

This project was developed with the assistance of **Claude (Anthropic)**.

### What was generated with AI
- Initial boilerplate structure for Express routes
- CSS layout patterns (grid, flexbox, responsive breakpoints)
- Skeleton loading animation styles
- Utility functions (`escHtml`, `escAttr`, `enrichWithItunes`)
- Debugging assistance for async data-fetching logic

### What was manually written and modified
- Overall application architecture and page navigation system
- All API integration logic and data transformation pipelines
- Artist panel, search flow, and chart filtering logic
- Audio preview player implementation
- UI/UX design decisions, color system, and typography
- Error handling strategies and retry logic
- Backend enrichment strategy (Last.fm + iTunes dual-source approach)

### How AI was used
AI was used as a coding assistant — generating code suggestions that were then reviewed, adapted, and integrated manually. Every piece of generated code was understood, tested, and modified to fit the project's specific requirements. The final architecture, design, and all key decisions were made by us.

---

## Future Improvements

- Functional authentication with a real database (currently UI only)
- Playlist creation and persistence
- User-generated social posts
- Mobile-responsive layout improvements
- Spotify API integration for richer audio previews
- Caching layer on the backend to reduce API latency

---

## Authors

Victor Bosshard
Jules Duplantier

---

## License

This project is for educational purposes only.
