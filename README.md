# Deezer-Top-100-Daily-Player by Filip Ilovsky

An immersive, swipable music player that streams **Deezer’s Top 100 worldwide tracks**, **updated automatically** every day.  
Built with a modern **HTML**, **CSS**, and **JavaScript** **frontend** and a **lightweight Node.js backend server**, it transforms **raw chart data** into a seamless, interactive listening experience.


## ✨ Features

- **Daily auto-updated Top 100** – backend server fetches the freshest Deezer worldwide charts every day.

- **Preview-only playback (copyright compliant)** – streams official 30-second previews, respecting music licensing rules.

- **Shuffle & repeat-current modes** – with clear “ON” states for instant feedback.

- **Preloaded next track** – upcoming audio is preloaded for snappy, seamless playback.

- **Swipable cover deck** – interactive card-style browsing powered by Swiper.js.

- **Scrollable, responsive playlist** – filter by search or liked-only for quick navigation.

- **Sticky toolbar & player** – top filters and bottom controls stay accessible at all times.

- **Smart auto-scroll** – active track always stays visible, never hidden under the toolbar or player.

- **Node.js backend proxy** – bypasses Deezer CORS restrictions for secure, reliable API access.

- **Auto-refresh with visibility awarenes** – updates every 30 minutes only when the tab is active, avoiding wasted requests.

- **Duplicate & invalid tracks removed** – playlist contains only playable previews.


- **LocalStorage preferences** – volume, shuffle, repeat, liked songs, and last played track all saved between sessions.

- **Playback resumes where you left off** – even after closing or refreshing the browser.

- **Full keyboard support** – intuitive shortcuts for faster control:

  - `Space` - Play / Pause

  - `→`/ `←` - Next / Previous track

  - `Shift + →` / `Shift + ←` - Seek ±5s

  - `?` - Toggle help overlay

- **ARIA labels & tooltips** – designed with accessibility in mind.

- **Liked songs system** – save favorites and instantly filter to view only your liked tracks.










 
## 🎥 Demo

![demo](demo/demo.gif)


## 🚀 How to Run

1. Clone this repository:
   ```bash
   git clone https://github.com/Filip-2002/Deezer-Top-100-Daily-Player.git
   cd Deezer-Top-100-Daily-Player
   ```

2. Start the Backend (Node.js server):
   The backend acts as a proxy to Deezer’s API and auto-updates the Top 100 playlist.
   ```bash
   cd backend
   npm install
   node server.js
   ```

   By default, the server runs at:
   ```bash
   http://localhost:3000
   ```

3. Open the Frontend

   The frontend lives in the frontend folder. Simply open index.html in your browser:
  
   Option 1: double-click index.html
  
   Option 2: serve it with a local dev server (better for CORS/cache handling). Example:
   ```bash
   cd frontend
   npx serve .
   ```
  
   
