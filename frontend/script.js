document.addEventListener("DOMContentLoaded", () => {
  const AUTOPLAY_ON_LOAD = false
  const SOURCE = "playlist"
  const DEEZER_PLAYLIST_ID = "3155776842"
  const CHART_COUNTRY = "0"
  const AUTO_REFRESH_MS = 30 * 60 * 1000
  const PREFS_KEY = "mprefs"

  const audioPlayer = document.getElementById("audioPlayer")
  const playPauseBtn = document.getElementById("playPauseBtn")
  const playPauseIcon = document.getElementById("playPauseIcon")
  const progressBar = document.getElementById("progress-bar")
  const volumeRange = document.getElementById("volume-range")
  const nextBtn = document.getElementById("nextBtn")
  const prevBtn = document.getElementById("prevBtn")
  const shuffleBtn = document.getElementById("shuffleBtn")
  const repeatBtn = document.getElementById("repeatBtn")
  const currentTimeEl = document.getElementById("currentTime")
  const totalTimeEl = document.getElementById("totalTime")
  const refreshBtn = document.getElementById("refreshBtn")
  const helpBtn = document.getElementById("helpBtn")
  const closeHelpBtn = document.getElementById("closeHelpBtn")
  const helpOverlay = document.getElementById("helpOverlay")
  const searchInput = document.getElementById("searchInput")
  const likedOnlyToggle = document.getElementById("likedOnlyToggle")
  const metaLine = document.getElementById("metaLine")
  const playlistEl = document.querySelector(".playlist")
  const sliderEl = document.getElementById("slider")
  const playerEl = document.querySelector(".player")
  const seekTooltip = document.getElementById("seekTooltip")
  const toastEl = document.getElementById("toast")
  const volumeIcon = document.getElementById("volumeIcon");

  let endSpacerEl = null
  let currentSongIndex = 0
  let isShuffle = false
  let repeatOne = false
  let history = []
  let swiper = null
  let isLoading = false
  let likedIds = new Set()
  let preloadedAudio = null
  let suppressHistory = false
  window.songList = []

  function applyToolbarOffset() {
    const tb = document.querySelector(".toolbar");
    const player = document.querySelector(".player");
    const content = document.querySelector(".content");
    if (!tb || !content) return;

    const topH = tb.getBoundingClientRect().height || 0;
    const bottomH = player?.getBoundingClientRect().height || 0;

    content.style.scrollPaddingTop = `${topH + 12}px`;
    content.style.scrollPaddingBottom = `${bottomH + 20}px`;
  }

window.addEventListener("resize", applyToolbarOffset);
applyToolbarOffset();


  const toast = (msg) => {
    toastEl.textContent = msg
    toastEl.classList.add("show")
    setTimeout(() => toastEl.classList.remove("show"), 1600)
  }

  const formatTime = (sec) => {
    if (!isFinite(sec)) return "0:00"
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  function ensureEndSpacer() {
    if (!endSpacerEl) {
      endSpacerEl = document.createElement("div")
      endSpacerEl.id = "playlistEndSpacer"
      endSpacerEl.style.width = "100%"
      endSpacerEl.style.pointerEvents = "none"
      endSpacerEl.style.flex = "0 0 auto"
      playlistEl.appendChild(endSpacerEl)
    }
    const h = (playerEl?.offsetHeight || 0) + 16
    endSpacerEl.style.height = h + "px"
  }

  function ensureRowVisible(row) {
    if (!row) return
    const tb = document.querySelector(".toolbar")
    const pr = document.querySelector(".player")?.getBoundingClientRect()
    const cr = document.querySelector(".content").getBoundingClientRect()
    const rr = row.getBoundingClientRect()
    const gap = 12
    const toolbarH = tb ? tb.getBoundingClientRect().height : 0
    const bottomLimit = cr.bottom - (pr?.height || 0) - gap
    const topLimit = cr.top + toolbarH + gap
    const content = document.querySelector(".content")
    if (rr.bottom > bottomLimit) content.scrollTop += rr.bottom - bottomLimit
    if (rr.top < topLimit) content.scrollTop += rr.top - topLimit
  }

  function updateActiveRow(index) {
    document.querySelectorAll(".playlist-item")
      .forEach(el => el.classList.remove("active-playlist-item"));

    const activeItem = document.querySelector(`.playlist-item[data-index="${index}"]`);
    if (!activeItem) return;

    activeItem.classList.add("active-playlist-item");

    const tb = document.querySelector(".toolbar");
    const player = document.querySelector(".player");
    const content = document.querySelector(".content");

    const toolbarH = tb?.getBoundingClientRect().height || 0;
    const playerH = player?.getBoundingClientRect().height || 0;
    const gap = 12;

    const contentRect = content.getBoundingClientRect();
    const rowRect = activeItem.getBoundingClientRect();

    const topLimit = contentRect.top + toolbarH + gap;
    const bottomLimit = contentRect.bottom - playerH - gap;

    if (rowRect.top < topLimit) {
      content.scrollTop -= (topLimit - rowRect.top);
    }
    else if (rowRect.bottom > bottomLimit) {
      content.scrollTop += (rowRect.bottom - bottomLimit);
    }
  }



  function savePrefs() {
    const data = {
      idx: currentSongIndex,
      vol: audioPlayer.volume,
      shuffle: isShuffle,
      repeatOne: repeatOne,
      liked: Array.from(likedIds),
    }
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(data)) } catch {}
  }

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")
      const vol = (typeof p.vol === "number") ? Math.min(Math.max(p.vol, 0), 1) : 0.8
      audioPlayer.volume = vol
      if (volumeRange) volumeRange.value = Math.round(vol * 100)
      if (typeof p.shuffle === "boolean") isShuffle = p.shuffle
      setShuffleUI()
      if (typeof p.repeatOne === "boolean") repeatOne = p.repeatOne
      if (Array.isArray(p.liked)) likedIds = new Set(p.liked)
      if (typeof p.idx === "number") currentSongIndex = p.idx
      setRepeatUI()
    } catch {
      audioPlayer.volume = 0.8
      if (volumeRange) volumeRange.value = 80
    }
  }

  const setShuffleUI = () => {
    shuffleBtn.classList.toggle("active", isShuffle)
    shuffleBtn.setAttribute("aria-pressed", String(isShuffle))
    shuffleBtn.title = `Shuffle: ${isShuffle ? "ON" : "OFF"}`
  }

  const setRepeatUI = () => {
    repeatBtn.classList.toggle("active", repeatOne)
    repeatBtn.setAttribute("aria-pressed", String(repeatOne))
    repeatBtn.title = `Repeat current: ${repeatOne ? "ON" : "OFF"}`
  }

  async function playSong(index, { pushHistory = true } = {}) {
    const song = window.songList[index]
    if (!song || !song.preview) return
    try {
      if (audioPlayer.src !== song.preview) audioPlayer.src = song.preview
      await audioPlayer.play()
      currentSongIndex = index
      if (pushHistory && !suppressHistory) {
        if (history.length === 0 || history[history.length - 1] !== index) {
          history.push(index)
        }
      }
      updateActiveRow(index)
      playPauseIcon.classList.replace("fa-play", "fa-pause")
      const next = isShuffle ? getRandomIndex() : (currentSongIndex + 1) % window.songList.length
      if (window.songList[next]?.preview) {
        try {
          preloadedAudio = new Audio(window.songList[next].preview)
          preloadedAudio.preload = "auto"
        } catch {}
      }
      if (swiper && swiper.realIndex !== index) swiper.slideTo(index, 300)
      savePrefs()
    } catch {}
  }

  function getRandomIndex() {
    if (window.songList.length <= 1) return 0
    let i
    do { i = Math.floor(Math.random() * window.songList.length) }
    while (i === currentSongIndex)
    return i
  }

  shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle
    setShuffleUI()
    savePrefs()
  })

  repeatBtn.addEventListener("click", () => {
    repeatOne = !repeatOne
    setRepeatUI()
    savePrefs()
  })

  nextBtn.addEventListener("click", () => {
    if (repeatOne) {
      audioPlayer.currentTime = 0
      audioPlayer.play()
      return
    }
    const next = isShuffle ? getRandomIndex() : (currentSongIndex + 1) % window.songList.length
    swiper ? swiper.slideTo(next) : playSong(next)
  })

  prevBtn.addEventListener("click", () => {
  if (repeatOne) {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    return;
  }
  if (history.length > 0) {
    history.pop();
  }
  
  const prev = history[history.length - 1];

  suppressHistory = true;
  if (prev != null) {
    if (swiper) swiper.slideTo(prev);
    else playSong(prev, { pushHistory: false });
  } else {
    if (swiper) swiper.slidePrev();
  }
});


  playPauseBtn.addEventListener("click", async () => {
    if (window.songList.length === 0) return
    if (!audioPlayer.src) playSong(0)
    if (audioPlayer.paused) {
      try {
        await audioPlayer.play()
        playPauseIcon.classList.replace("fa-play", "fa-pause")
        updateActiveRow(currentSongIndex)
      } catch {}
    } else {
      audioPlayer.pause()
      playPauseIcon.classList.replace("fa-pause", "fa-play")
    }
  })

  audioPlayer.addEventListener("ended", () => {
    if (repeatOne) {
      audioPlayer.currentTime = 0
      audioPlayer.play()
      return
    }
    const next = isShuffle ? getRandomIndex() : (currentSongIndex + 1) % window.songList.length
    swiper ? swiper.slideTo(next) : playSong(next)
  })

  audioPlayer.addEventListener("loadedmetadata", () => {
    totalTimeEl.textContent = formatTime(audioPlayer.duration)
  })

  audioPlayer.addEventListener("timeupdate", () => {
    if (!isNaN(audioPlayer.duration)) {
      progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100
      currentTimeEl.textContent = formatTime(audioPlayer.currentTime)
      totalTimeEl.textContent = formatTime(audioPlayer.duration)
    }
  })

  progressBar.addEventListener("input", e => {
    if (!isNaN(audioPlayer.duration)) {
      audioPlayer.currentTime = (e.target.value / 100) * audioPlayer.duration
    }
  })

  progressBar.addEventListener("mousemove", (e) => {
    const rect = progressBar.getBoundingClientRect()
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    const t = pct * (audioPlayer.duration || 0)
    seekTooltip.textContent = formatTime(t)
    seekTooltip.style.left = `${pct * 100}%`
    seekTooltip.classList.add("show")
  })

  progressBar.addEventListener("mouseleave", () => {
    seekTooltip.classList.remove("show")
  })

  volumeRange.addEventListener("input", e => {
    audioPlayer.volume = e.target.value / 100
    savePrefs()
  })

  let lastVolume = audioPlayer.volume; // remember last non-muted volume

  volumeIcon.addEventListener("click", () => {
    if (audioPlayer.volume > 0) {
      lastVolume = audioPlayer.volume;     // save current volume
      audioPlayer.volume = 0;              // mute
      volumeRange.value = 0;
      volumeIcon.className = "fa-solid fa-volume-xmark"; // muted icon
    } else {
      audioPlayer.volume = lastVolume || 0.8; // restore last volume or default
      volumeRange.value = Math.round(audioPlayer.volume * 100);
      volumeIcon.className = "fa-solid fa-volume-high"; // back to loud icon
    }
    savePrefs();
  });

  if (audioPlayer.volume === 0) {
  volumeIcon.className = "fa-solid fa-volume-xmark";
} else {
  volumeIcon.className = "fa-solid fa-volume-high";
}


  function applyFilters() {
    const q = (searchInput?.value || "").toLowerCase().trim()
    const likedOnly = !!likedOnlyToggle?.checked
    document.querySelectorAll(".playlist-item").forEach(row => {
      const idx = Number(row.dataset.index)
      const s = window.songList[idx]
      const text = `${s.title} ${s.artist}`.toLowerCase()
      const matchesQuery = q === "" || text.includes(q)
      const matchesLiked = !likedOnly || likedIds.has(s.id)
      row.style.display = (matchesQuery && matchesLiked) ? "" : "none"
    })
  }

  searchInput?.addEventListener("input", applyFilters)
  likedOnlyToggle?.addEventListener("change", applyFilters)

  function buildRowAndSlide(track, newIndex) {
    const isLiked = likedIds.has(track.id)
    const row = document.createElement("div")
    row.className = "playlist-item"
    row.dataset.index = newIndex
    row.innerHTML = `
      <img src="${track.cover}" alt="cover" class="playlist-cover">
      <div class="song">
        <p><strong>${track.title}</strong></p>
        <p>${track.artist}</p>
      </div>
      <div class="actions">
        <button class="row-btn heart-btn ${isLiked ? "active" : ""}" title="Like" aria-label="Like">
          <i class="fa-solid fa-heart"></i>
        </button>
        <button class="row-btn share-btn" title="Copy title & artist" aria-label="Copy title and artist">
          <i class="fa-solid fa-copy"></i>
        </button>
        <a class="row-btn fullsong-btn" href="${track.url}" target="_blank" rel="noopener noreferrer">Full</a>
      </div>
    `
    playlistEl.appendChild(row)
    row.addEventListener("click", (e) => {
      const isAction = e.target.closest?.(".row-btn,.fullsong-btn")
      if (isAction) return
      swiper ? swiper.slideTo(newIndex) : playSong(newIndex)
    })
    row.querySelector(".heart-btn").addEventListener("click", (e) => {
      e.stopPropagation()
      const btn = e.currentTarget
      if (likedIds.has(track.id)) {
        likedIds.delete(track.id)
        btn.classList.remove("active")
        toast("Removed from Liked")
      } else {
        likedIds.add(track.id)
        btn.classList.add("active")
        toast("Added to Liked")
      }
      savePrefs()
      applyFilters()
    })
    row.querySelector(".share-btn").addEventListener("click", async (e) => {
      e.stopPropagation()
      const text = `${track.title} - ${track.artist}`
      try {
        await navigator.clipboard.writeText(text)
        toast("Title & artist copied")
      } catch {
        toast("Copy failed")
      }
    })
    const slide = document.createElement("div")
    slide.className = "swiper-slide"
    slide.innerHTML = `
      <img src="${track.cover}" alt="${track.title}">
      <h1 class="song-title">${track.title}</h1>
      <h2 class="artist-name">${track.artist}</h2>
    `
    sliderEl.appendChild(slide)
  }

  async function getTrendingSongs(fromUser = false) {
    if (isLoading) return
    isLoading = true
    try {
      let qs
      if (SOURCE === "playlist") {
        qs = `source=playlist&id=${encodeURIComponent(DEEZER_PLAYLIST_ID)}&limit=100`
      } else {
        qs = `source=chart&country=${encodeURIComponent(CHART_COUNTRY)}&limit=100`
      }
      const res = await fetch(`http://localhost:3000/trending?${qs}&ts=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
      const json = await res.json()
      const all = Array.isArray(json?.data) ? json.data : []
      const seen = new Set()
      const out = []
      for (const t of all) {
        if (seen.has(t.id)) continue
        seen.add(t.id)
        if (!t.preview) continue
        out.push({
          id: t.id,
          title: t.title,
          artist: t.artist?.name || (t.artist && t.artist[0]?.name) || "Unknown",
          cover: t.album?.cover_xl || t.album?.cover_big || t.album?.cover_medium || t.album?.cover || "",
          preview: t.preview,
          url: t.link,
        })
      }
      if (swiper) { try { swiper.destroy(true, true) } catch {} swiper = null }
      playlistEl.innerHTML = ""
      sliderEl.innerHTML = ""
      window.songList = out
      history = []
      out.forEach((track, i) => buildRowAndSlide(track, i))
      ensureEndSpacer()
      swiper = new Swiper(".swiper", {
        effect: "cards",
        grabCursor: true,
        allowTouchMove: true,
        centeredSlides: true,
        cardsEffect: { perSlideRotate: 5, perSlideOffset: 18, slideShadows: false },
        initialSlide: Math.min(currentSongIndex, out.length - 1),
      })
      swiper.on("slideChange", () => {
        const idx = swiper.realIndex
        playSong(idx, { pushHistory: !suppressHistory })
        suppressHistory = false
      })
      const updated = new Date().toLocaleTimeString()
      metaLine.textContent = `Source: ${SOURCE} • Showing ${out.length} playable • Updated ${updated}`
      if (out.length === 0) {
        playlistEl.innerHTML = "<p>No playable previews returned.</p>"
        toast("No playable tracks.")
        return
      }
      if (AUTOPLAY_ON_LOAD) playSong(currentSongIndex, { pushHistory: false })
      else playSong(currentSongIndex, { pushHistory: false })
      applyFilters()
      if (fromUser) toast("Refreshed")
    } catch {
      toast("Fetch error")
    } finally {
      isLoading = false
    }
  }

  getTrendingSongs()

  setInterval(() => {
    if (!document.hidden && !isLoading) getTrendingSongs()
  }, AUTO_REFRESH_MS)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !isLoading) getTrendingSongs()
  })
  refreshBtn?.addEventListener("click", () => getTrendingSongs(true))

  document.addEventListener("keydown", (e) => {
    const ae = document.activeElement
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return
    if (e.key === "ArrowRight" && e.shiftKey) { e.preventDefault(); audioPlayer.currentTime += 5; return }
    if (e.key === "ArrowLeft" && e.shiftKey) { e.preventDefault(); audioPlayer.currentTime -= 5; return }
    if (e.key === "ArrowRight") { e.preventDefault(); nextBtn.click() }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prevBtn.click() }
    else if (e.code === "Space") { e.preventDefault(); playPauseBtn.click() }
    else if (e.key === "?") {
      e.preventDefault()
      helpOverlay.classList.toggle("visible")
    }
  })

  helpBtn?.addEventListener("click", () => helpOverlay.classList.add("visible"))
  closeHelpBtn?.addEventListener("click", () => helpOverlay.classList.remove("visible"))
  helpOverlay?.addEventListener("click", (e) => {
    if (e.target === helpOverlay) helpOverlay.classList.remove("visible")
  })

  loadPrefs()
  ensureEndSpacer()
})
