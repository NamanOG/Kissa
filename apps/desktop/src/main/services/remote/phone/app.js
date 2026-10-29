// Kissa phone remote. Served by Kissa on the home network; talks only to the PC it came from.
;(function () {
  'use strict'

  var KEY_STORE = 'kissa-remote-key'
  var $ = function (id) {
    return document.getElementById(id)
  }

  // ---- Words ---------------------------------------------------------------------------------
  // English and Spanish, following Kissa's own language once the PC says which it uses.

  var WORDS = {
    en: {
      connecting: 'Connecting',
      reconnecting: 'Reconnecting',
      unreachable: 'Not reachable',
      nothing: 'Nothing playing',
      nothingSub: 'Play something on your PC',
      untitled: 'Untitled',
      play: 'Play',
      pause: 'Pause',
      prev: 'Previous track',
      next: 'Next track',
      volume: 'PC volume',
      lyrics: 'Lyrics',
      noLyrics: 'No timed lyrics for this song.',
      look: 'Room and record',
      upNext: 'Up next',
      done: 'Done',
      pairTitle: 'Connect to Kissa',
      pairText: 'Enter the code shown in Kissa, under Phone remote.',
      pairGo: 'Connect',
      codeLabel: 'Six-digit code',
      sixDigits: 'The code has six digits.',
      wrong: 'That code did not match. Check Kissa and try again.',
      wait: 'Too many wrong codes. Wait half a minute, then enter the new code from Kissa.',
      noAnswer: 'Kissa did not answer. Is the phone remote switched on?',
      offTitle: 'The remote is off',
      offText: 'Switch on the phone remote in Kissa, then enter the new code.',
      awayTitle: 'Kissa is not reachable',
      awayText:
        'Kissa may be closed. Check that this phone is on the same Wi-Fi as your PC. This page keeps trying.',
      enterCode: 'Enter the code',
      room: 'Room',
      record: 'Record',
      finish: 'Turntable finish',
      light: 'Room light',
      lyricsOnPc: 'Lyrics on the PC',
      sleep: 'Sleep timer',
      sleepOff: 'Off',
      min: '{n} min',
      sleepLeft: 'Music stops in {t}',
      queueChanged: 'The play order changed. Choose a track from the updated list.',
      cantPlay: 'This track is not available to play here.',
      offline: 'Reconnect to your PC to choose tracks.',
      noTracks: 'No tracks to show right now.',
      showing: 'Showing {n} of {total} tracks.',
      playTrack: 'Play {title}',
      unavailable: 'Unavailable'
    },
    es: {
      connecting: 'Conectando',
      reconnecting: 'Reconectando',
      unreachable: 'Sin conexión',
      nothing: 'No suena nada',
      nothingSub: 'Pon algo en tu PC',
      untitled: 'Sin título',
      play: 'Reproducir',
      pause: 'Pausar',
      prev: 'Canción anterior',
      next: 'Canción siguiente',
      volume: 'Volumen del PC',
      lyrics: 'Letra',
      noLyrics: 'Esta canción no tiene letra sincronizada.',
      look: 'Sala y disco',
      upNext: 'A continuación',
      done: 'Listo',
      pairTitle: 'Conectar con Kissa',
      pairText: 'Escribe el código que aparece en Kissa, en Mando del móvil.',
      pairGo: 'Conectar',
      codeLabel: 'Código de seis cifras',
      sixDigits: 'El código tiene seis cifras.',
      wrong: 'El código no coincide. Revisa Kissa y vuelve a intentarlo.',
      wait: 'Demasiados códigos erróneos. Espera medio minuto y escribe el nuevo código de Kissa.',
      noAnswer: 'Kissa no responde. ¿Está encendido el mando del móvil?',
      offTitle: 'El mando está apagado',
      offText: 'Enciende el mando del móvil en Kissa y escribe el nuevo código.',
      awayTitle: 'No se encuentra Kissa',
      awayText:
        'Puede que Kissa esté cerrado. Comprueba que el móvil está en la misma wifi que tu PC. Esta página sigue intentándolo.',
      enterCode: 'Escribir el código',
      room: 'Sala',
      record: 'Disco',
      finish: 'Acabado del tocadiscos',
      light: 'Luz de la sala',
      lyricsOnPc: 'Letra en el PC',
      sleep: 'Temporizador',
      sleepOff: 'No',
      min: '{n} min',
      sleepLeft: 'La música se para en {t}',
      queueChanged: 'El orden cambió. Elige una canción de la lista actualizada.',
      cantPlay: 'Esta canción no se puede reproducir aquí.',
      offline: 'Vuelve a conectar con tu PC para elegir canciones.',
      noTracks: 'No hay canciones que mostrar.',
      showing: 'Mostrando {n} de {total} canciones.',
      playTrack: 'Reproducir {title}',
      unavailable: 'No disponible'
    }
  }
  var lang = /^es\b/i.test(navigator.language || '') ? 'es' : 'en'
  function T(k, vars) {
    var s = (WORDS[lang] && WORDS[lang][k]) || WORDS.en[k] || k
    if (vars)
      s = s.replace(/\{(\w+)\}/g, function (_, v) {
        return vars[v] === undefined ? '' : String(vars[v])
      })
    return s
  }

  var el = {
    body: document.body,
    link: $('link'),
    linkText: $('link-text'),
    player: $('player'),
    pair: $('pair'),
    gone: $('gone'),
    roomArt: $('room-art'),
    cover: $('cover'),
    coverImg: $('cover-img'),
    lyricsList: $('lyrics'),
    title: $('title'),
    artist: $('artist'),
    bar: $('bar'),
    elapsed: $('elapsed'),
    remaining: $('remaining'),
    prev: $('prev'),
    play: $('play'),
    next: $('next'),
    volume: $('volume'),
    volumeRange: $('volume-range'),
    lyricsToggle: $('lyrics-toggle'),
    lookOpen: $('look-open'),
    queueOpen: $('queue-open'),
    pairForm: $('pair-form'),
    pairCode: $('pair-code'),
    codeBox: document.querySelector('.code'),
    codeCells: $('code-cells').children,
    pairGo: $('pair-go'),
    pairNote: $('pair-note'),
    goneRetry: $('gone-retry'),
    goneTitle: $('gone-title'),
    goneText: $('gone-text')
  }
  var lookSheet = $('look-sheet')
  var queueSheet = $('queue-sheet')

  var key = readKey()
  var connected = false
  var events = null
  var retryTimer = 0
  var state = null
  var stateAt = 0
  var lyrics = []
  var shownLyric = -2
  var showLyrics = false
  var queue = null
  var look = null
  var lookAt = 0
  var dragging = false
  var volumeTimer = 0
  var pendingVolume = null
  var lightTimer = 0
  var artShown = ''
  var misses = 0
  var goneAway = false

  try {
    showLyrics = localStorage.getItem('kissa-remote-lyrics') === '1'
  } catch {
    showLyrics = false
  }

  function readKey() {
    // The key only ever comes from typing Kissa's code; an old link that carried one is ignored.
    if (location.hash) history.replaceState(null, '', '/')
    try {
      return localStorage.getItem(KEY_STORE)
    } catch {
      return null
    }
  }

  function forgetKey() {
    key = null
    try {
      localStorage.removeItem(KEY_STORE)
    } catch {
      // storage blocked (private mode): the key lasts this visit only
    }
  }

  // All fixed words on the page, set again whenever the language changes.
  function paintWords() {
    document.documentElement.lang = lang
    el.prev.setAttribute('aria-label', T('prev'))
    el.next.setAttribute('aria-label', T('next'))
    el.play.setAttribute('aria-label', state && state.isPlaying ? T('pause') : T('play'))
    el.volumeRange.setAttribute('aria-label', T('volume'))
    el.lyricsToggle.setAttribute('aria-label', T('lyrics'))
    el.lookOpen.setAttribute('aria-label', T('look'))
    el.queueOpen.setAttribute('aria-label', T('upNext'))
    $('pair-title').textContent = T('pairTitle')
    $('pair-text').textContent = T('pairText')
    el.pairCode.setAttribute('aria-label', T('codeLabel'))
    el.pairGo.textContent = T('pairGo')
    el.goneRetry.textContent = T('enterCode')
    $('look-title').textContent = T('look')
    $('queue-title').textContent = T('upNext')
    var closers = document.querySelectorAll('[data-close]')
    for (var i = 0; i < closers.length; i++) closers[i].textContent = T('done')
    if (!el.gone.hidden) showGone(goneAway)
    onState(state)
    paintLyrics(true)
    if (lookSheet.open) renderLook()
    renderQueue()
  }

  function show(view) {
    if (view !== 'player') {
      if (lookSheet.open) lookSheet.close()
      if (queueSheet.open) queueSheet.close()
    }
    el.player.hidden = view !== 'player'
    el.pair.hidden = view !== 'pair'
    el.gone.hidden = view !== 'gone'
    if (view === 'pair')
      setTimeout(function () {
        el.pairCode.focus()
      }, 50)
  }

  function setLink(live, word) {
    connected = live
    el.link.classList.toggle('is-live', live)
    el.linkText.textContent = live ? '' : T(word)
    renderQueue()
  }

  // ---- Connection --------------------------------------------------------------------------

  function connect() {
    clearTimeout(retryTimer)
    retryTimer = 0
    if (!key) {
      setLink(false, 'connecting')
      show('pair')
      return
    }
    if (events) events.close()
    setLink(false, 'connecting')
    events = new EventSource('/api/events?k=' + encodeURIComponent(key))
    events.addEventListener('open', function () {
      misses = 0
      clearTimeout(retryTimer)
      retryTimer = 0
      setLink(true)
      show('player')
    })
    events.addEventListener('state', function (e) {
      onState(JSON.parse(e.data))
    })
    events.addEventListener('lyrics', function (e) {
      lyrics = JSON.parse(e.data) || []
      shownLyric = -2
      tick()
    })
    events.addEventListener('volume', function (e) {
      onVolume(JSON.parse(e.data))
    })
    events.addEventListener('queue', function (e) {
      queue = JSON.parse(e.data)
      renderQueue()
    })
    events.addEventListener('look', function (e) {
      onLook(JSON.parse(e.data))
    })
    events.addEventListener('error', function () {
      setLink(false, 'reconnecting')
      // A refused key closes the stream at once; a PC that went away leaves it retrying, so
      // look again shortly either way (once, not on every retry).
      var source = events
      if (retryTimer && source && source.readyState !== 2) return
      clearTimeout(retryTimer)
      retryTimer = setTimeout(
        function () {
          retryTimer = 0
          if (events !== source || (source && source.readyState === 1)) return
          if (source) source.close()
          events = null
          check()
        },
        source && source.readyState === 2 ? 0 : 2500
      )
    })
  }

  // A closed stream means the key is no longer good (remote switched off) or the PC is away.
  function check() {
    fetch('/api/art?k=' + encodeURIComponent(key || ''), { cache: 'no-store' })
      .then(function (res) {
        if (res.status === 401) {
          forgetKey()
          setLink(false, 'connecting')
          showGone(false)
        } else {
          retryTimer = setTimeout(connect, 1500)
        }
      })
      .catch(function () {
        misses++
        setLink(false, 'unreachable')
        // A moment's Wi-Fi drop keeps the player; a longer absence says what to check.
        if (misses >= 2) showGone(true)
        // Look again soon after a blip, then more gently while the PC stays away.
        retryTimer = setTimeout(connect, Math.min(6000, 1200 * misses))
      })
  }

  function showGone(away) {
    goneAway = away
    el.goneTitle.textContent = away ? T('awayTitle') : T('offTitle')
    el.goneText.textContent = away ? T('awayText') : T('offText')
    el.goneRetry.hidden = away
    show('gone')
  }

  function send(body) {
    if (!key) return Promise.resolve()
    return fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        if (res.status === 401) {
          forgetKey()
          showGone(false)
        }
        return res
      })
      .catch(function () {
        setLink(false, 'unreachable')
      })
  }

  function tap() {
    if (navigator.vibrate) navigator.vibrate(8)
  }

  // ---- Now playing -------------------------------------------------------------------------

  function onState(next) {
    state = next
    stateAt = performance.now()
    if (!next) {
      el.title.textContent = T('nothing')
      el.artist.textContent = T('nothingSub')
      el.body.classList.remove('is-playing')
      el.play.setAttribute('aria-label', T('play'))
      setArt(null)
      tick()
      return
    }
    el.title.textContent = next.title || T('untitled')
    el.artist.textContent = next.artist || next.album || ''
    el.body.classList.toggle('is-playing', !!next.isPlaying)
    el.play.setAttribute('aria-label', next.isPlaying ? T('pause') : T('play'))
    el.prev.disabled = next.canSkip === false
    el.next.disabled = next.canSkip === false
    if (next.accent) document.documentElement.style.setProperty('--accent', next.accent)
    setArt(next.art)
    document.title = next.title ? next.title + ' · Kissa' : 'Kissa'
    tick()
  }

  function setArt(path) {
    var src = path && key ? path + '&k=' + encodeURIComponent(key) : ''
    if (src === artShown) return
    artShown = src
    if (!src) {
      el.coverImg.classList.remove('ready')
      el.cover.classList.remove('has-art')
      el.roomArt.classList.remove('has-art')
      return
    }
    loadArt(src, 0)
  }

  // A web cover is fetched by Kissa first, so the first ask can miss: try again a few times,
  // a little later each time, and keep the previous cover meanwhile.
  function loadArt(src, tries) {
    var img = new Image()
    img.onload = function () {
      if (artShown !== src) return
      var shown = tries ? src + '&r=' + tries : src
      el.coverImg.src = shown
      el.coverImg.classList.add('ready')
      el.cover.classList.add('has-art')
      el.roomArt.style.backgroundImage = 'url("' + shown + '")'
      el.roomArt.classList.add('has-art')
    }
    img.onerror = function () {
      if (artShown !== src || tries >= 3) return
      setTimeout(function () {
        if (artShown === src) loadArt(src, tries + 1)
      }, 800 * (tries + 1))
    }
    img.src = tries ? src + '&r=' + tries : src
  }

  function position() {
    if (!state) return 0
    var p = state.progress + (state.isPlaying ? (performance.now() - stateAt) / 1000 : 0)
    return state.duration > 0 ? Math.min(p, state.duration) : p
  }

  function clock(s) {
    s = Math.max(0, Math.floor(s))
    var m = Math.floor(s / 60)
    var r = s % 60
    return m + ':' + (r < 10 ? '0' : '') + r
  }

  function lyricIndex(p) {
    var index = -1
    for (var lo = 0, hi = lyrics.length - 1; lo <= hi;) {
      var mid = (lo + hi) >> 1
      if (lyrics[mid].time <= p + 0.15) {
        index = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return index
  }

  // The line being sung, the one before it and the two after, like a lyric sheet.
  function paintLyrics(force) {
    var index = lyricIndex(position())
    if (index === shownLyric && !force) return
    shownLyric = index
    var list = el.lyricsList
    var fragment = document.createDocumentFragment()
    if (!lyrics.length) {
      var empty = document.createElement('li')
      empty.className = 'empty'
      empty.textContent = T('noLyrics')
      fragment.appendChild(empty)
    } else {
      for (var i = Math.max(0, index - 1); i <= Math.min(lyrics.length - 1, index + 2); i++) {
        var li = document.createElement('li')
        li.textContent = lyrics[i].text || '♪'
        if (i === index) li.className = 'now'
        fragment.appendChild(li)
      }
    }
    list.replaceChildren(fragment)
  }

  function tick() {
    var p = position()
    var d = state ? state.duration : 0
    el.bar.style.transform = 'scaleX(' + (d > 0 ? Math.min(1, p / d) : 0) + ')'
    el.elapsed.textContent = clock(p)
    el.remaining.textContent = d > 0 ? '-' + clock(d - p) : ''
    if (showLyrics) paintLyrics(false)
    if (look && look.sleepLeft !== null && lookSheet.open) paintSleepLine()
  }

  function setShowLyrics(on) {
    showLyrics = on
    el.body.classList.toggle('show-lyrics', on)
    el.lyricsToggle.setAttribute('aria-pressed', on ? 'true' : 'false')
    try {
      localStorage.setItem('kissa-remote-lyrics', on ? '1' : '0')
    } catch {
      // storage blocked: the choice lasts this visit only
    }
    if (on) paintLyrics(true)
  }

  function onVolume(v) {
    var level = v && typeof v.level === 'number' ? v.level : null
    el.volume.hidden = level === null
    if (level === null || dragging || pendingVolume !== null) return
    el.volumeRange.value = String(level)
    paintRange(el.volumeRange)
  }

  function paintRange(input) {
    input.style.setProperty('--fill', input.value + '%')
  }

  // ---- Controls ----------------------------------------------------------------------------

  el.play.addEventListener('click', function () {
    tap()
    // Answer the tap at once; the PC's next update confirms it.
    if (state) {
      state.progress = position()
      stateAt = performance.now()
      state.isPlaying = !state.isPlaying
      el.body.classList.toggle('is-playing', state.isPlaying)
      el.play.setAttribute('aria-label', state.isPlaying ? T('pause') : T('play'))
    }
    send({ action: 'playPause' })
  })
  el.prev.addEventListener('click', function () {
    tap()
    send({ action: 'prev' })
  })
  el.next.addEventListener('click', function () {
    tap()
    send({ action: 'next' })
  })
  el.lyricsToggle.addEventListener('click', function () {
    tap()
    setShowLyrics(!showLyrics)
  })

  function flushVolume() {
    volumeTimer = 0
    if (pendingVolume === null) return
    var level = pendingVolume
    pendingVolume = null
    send({ action: 'volume', level: level })
  }
  el.volumeRange.addEventListener('input', function () {
    paintRange(el.volumeRange)
    pendingVolume = Number(el.volumeRange.value)
    if (!volumeTimer) volumeTimer = setTimeout(flushVolume, 90)
  })
  el.volumeRange.addEventListener('pointerdown', function () {
    dragging = true
  })
  window.addEventListener('pointerup', function () {
    dragging = false
  })
  el.volumeRange.addEventListener('change', function () {
    dragging = false
    clearTimeout(volumeTimer)
    flushVolume()
  })

  // ---- Sheets ------------------------------------------------------------------------------

  function openSheet(sheet, opener) {
    sheet.showModal()
    opener.setAttribute('aria-expanded', 'true')
    sheet.addEventListener(
      'close',
      function () {
        opener.setAttribute('aria-expanded', 'false')
        if (!el.player.hidden) opener.focus({ preventScroll: true })
      },
      { once: true }
    )
  }
  ;[lookSheet, queueSheet].forEach(function (sheet) {
    sheet.querySelector('[data-close]').addEventListener('click', function () {
      sheet.close()
    })
    // A tap on the dimmed page above the sheet closes it.
    sheet.addEventListener('click', function (event) {
      if (event.target !== sheet) return
      var rect = sheet.getBoundingClientRect()
      if (event.clientY < rect.top) sheet.close()
    })
    // Pull the sheet down by its top to close it.
    var head = sheet.querySelector('.sheet-head')
    var grab = sheet.querySelector('.grabber')
    var startY = null
    var dy = 0
    function down(e) {
      startY = e.touches[0].clientY
      dy = 0
      sheet.style.transition = 'none'
    }
    function move(e) {
      if (startY === null) return
      dy = Math.max(0, e.touches[0].clientY - startY)
      sheet.style.transform = 'translateY(' + dy + 'px)'
    }
    function up() {
      if (startY === null) return
      startY = null
      sheet.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
      sheet.style.transform = ''
      if (dy > 90) sheet.close()
    }
    ;[head, grab].forEach(function (target) {
      target.addEventListener('touchstart', down, { passive: true })
      target.addEventListener('touchmove', move, { passive: true })
      target.addEventListener('touchend', up)
      target.addEventListener('touchcancel', up)
    })
  })

  el.lookOpen.addEventListener('click', function () {
    tap()
    renderLook()
    openSheet(lookSheet, el.lookOpen)
  })
  el.queueOpen.addEventListener('click', function () {
    tap()
    openSheet(queueSheet, el.queueOpen)
  })

  // ---- Room and record ---------------------------------------------------------------------

  function onLook(next) {
    look = next
    lookAt = performance.now()
    var nextLang = next && next.lang === 'es' ? 'es' : 'en'
    if (next && nextLang !== lang) {
      lang = nextLang
      paintWords()
    }
    el.lookOpen.hidden = !next
    if (lookSheet.open) renderLook()
  }

  function setLook(setting, value) {
    tap()
    send({ action: 'look', setting: setting, value: value })
  }

  var TICK =
    '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'

  function node(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text !== undefined) n.textContent = text
    return n
  }

  function group(title, inner) {
    var g = node('section', 'group')
    var h = node('h3', 'group-title', title)
    g.append(h, inner)
    return g
  }

  function sleepLeftNow() {
    if (!look || look.sleepLeft === null) return null
    return Math.max(0, look.sleepLeft - (performance.now() - lookAt) / 1000)
  }

  function paintSleepLine() {
    var line = $('sleep-line')
    if (!line) return
    var left = sleepLeftNow()
    line.textContent = left === null ? '' : T('sleepLeft', { t: clock(left) })
  }

  function renderLook() {
    var body = $('look-body')
    var scroll = body.scrollTop
    var fragment = document.createDocumentFragment()
    if (!look) {
      body.replaceChildren()
      return
    }

    // Room
    var rooms = node('div', 'list')
    rooms.setAttribute('role', 'radiogroup')
    rooms.setAttribute('aria-label', T('room'))
    look.rooms.forEach(function (room) {
      var b = node('button', 'row')
      b.type = 'button'
      b.setAttribute('role', 'radio')
      b.setAttribute('aria-checked', room.id === look.room ? 'true' : 'false')
      if (room.swatch) {
        var dot = node('span', 'dot')
        dot.style.background = room.swatch
        b.appendChild(dot)
      }
      b.appendChild(node('span', 'row-name', room.name))
      b.insertAdjacentHTML('beforeend', TICK)
      b.addEventListener('click', function () {
        look.room = room.id
        renderLook()
        setLook('room', room.id)
      })
      rooms.appendChild(b)
    })
    fragment.appendChild(group(T('room'), rooms))

    // Light
    var lightBox = node('div', 'list')
    var lightRow = node('div', 'slider-row')
    lightRow.insertAdjacentHTML(
      'afterbegin',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/></svg>'
    )
    var light = node('input')
    light.type = 'range'
    light.min = '0'
    light.max = '100'
    light.step = '1'
    light.value = String(look.light)
    light.setAttribute('aria-label', T('light'))
    paintRange(light)
    light.addEventListener('input', function () {
      paintRange(light)
      look.light = Number(light.value)
      clearTimeout(lightTimer)
      lightTimer = setTimeout(function () {
        send({ action: 'look', setting: 'light', value: Number(light.value) })
      }, 80)
    })
    lightRow.appendChild(light)
    lightRow.insertAdjacentHTML(
      'beforeend',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/></svg>'
    )
    lightBox.appendChild(lightRow)
    fragment.appendChild(group(T('light'), lightBox))

    // Record
    var records = node('div', 'records')
    records.setAttribute('role', 'radiogroup')
    records.setAttribute('aria-label', T('record'))
    look.pressings.forEach(function (p) {
      var b = node('button', 'record')
      b.type = 'button'
      b.setAttribute('role', 'radio')
      b.setAttribute('aria-checked', p.id === look.pressing ? 'true' : 'false')
      var disc = node('span', 'disc')
      if (p.swatch) disc.style.background = p.swatch
      b.append(disc, node('span', '', p.name))
      b.addEventListener('click', function () {
        look.pressing = p.id
        renderLook()
        setLook('pressing', p.id)
      })
      records.appendChild(b)
    })
    fragment.appendChild(group(T('record'), records))

    // Finish
    var finishes = node('div', 'segments')
    finishes.setAttribute('role', 'radiogroup')
    finishes.setAttribute('aria-label', T('finish'))
    look.finishes.forEach(function (f) {
      var b = node('button', '', f.name)
      b.type = 'button'
      b.setAttribute('role', 'radio')
      b.setAttribute('aria-checked', f.id === look.finish ? 'true' : 'false')
      b.addEventListener('click', function () {
        look.finish = f.id
        renderLook()
        setLook('finish', f.id)
      })
      finishes.appendChild(b)
    })
    fragment.appendChild(group(T('finish'), finishes))

    // Lyrics on the PC
    var lyricBox = node('div', 'list')
    var lyricRow = node('button', 'row')
    lyricRow.type = 'button'
    lyricRow.appendChild(node('span', 'row-name', T('lyricsOnPc')))
    var sw = node('span', 'switch')
    lyricRow.setAttribute('role', 'switch')
    lyricRow.setAttribute('aria-checked', look.lyrics ? 'true' : 'false')
    sw.setAttribute('aria-checked', look.lyrics ? 'true' : 'false')
    lyricRow.appendChild(sw)
    lyricRow.addEventListener('click', function () {
      look.lyrics = !look.lyrics
      renderLook()
      setLook('lyrics', look.lyrics)
    })
    lyricBox.appendChild(lyricRow)
    fragment.appendChild(group(T('lyrics'), lyricBox))

    // Sleep timer
    var sleepWrap = node('div')
    var sleeps = node('div', 'segments')
    sleeps.setAttribute('role', 'radiogroup')
    sleeps.setAttribute('aria-label', T('sleep'))
    var left = sleepLeftNow()
    ;[0, 15, 30, 60, 90].forEach(function (m) {
      var b = node('button', '', m ? T('min', { n: m }) : T('sleepOff'))
      b.type = 'button'
      b.setAttribute('role', 'radio')
      b.setAttribute('aria-checked', (m === 0 ? left === null : false) ? 'true' : 'false')
      b.addEventListener('click', function () {
        look.sleepLeft = m ? m * 60 : null
        lookAt = performance.now()
        renderLook()
        setLook('sleep', m)
      })
      sleeps.appendChild(b)
    })
    var sleepLine = node('p', 'sub-line')
    sleepLine.id = 'sleep-line'
    sleepWrap.append(sleeps, sleepLine)
    fragment.appendChild(group(T('sleep'), sleepWrap))

    body.replaceChildren(fragment)
    body.scrollTop = scroll
    paintSleepLine()
  }

  // ---- Up next -----------------------------------------------------------------------------
  // Only a queue Kissa really plays (an album folder or Kissa's own order). A streaming app's
  // queue cannot be read, so for one the button is not shown at all.

  function renderQueue() {
    var own = !!queue && (queue.kind === 'album' || queue.kind === 'queue')
    el.queueOpen.hidden = !own
    if (!own) {
      if (queueSheet.open) queueSheet.close()
      return
    }
    $('queue-album').textContent = queue.title || ''
    var list = $('queue-list')
    var focused = document.activeElement
    var indexToRestore = focused && focused.dataset ? focused.dataset.index : null
    var scroll = list.scrollTop
    var fragment = document.createDocumentFragment()
    var rows = Array.isArray(queue.rows) ? queue.rows.slice(0, 200) : []
    rows.forEach(function (row) {
      var li = document.createElement('li')
      if (row.current) li.setAttribute('aria-current', 'true')
      var item = node(
        row.playable ? 'button' : 'div',
        'queue-row' + (row.current ? ' current' : '')
      )
      var number = node('span', 'queue-number', String(row.index + 1))
      number.setAttribute('aria-hidden', 'true')
      var name = node('span', 'queue-name', row.title || T('untitled'))
      if (!row.playable) name.appendChild(node('small', '', T('unavailable')))
      var length = node('span', 'queue-length', row.duration > 0 ? clock(row.duration) : '')
      item.append(number, name, length)
      if (row.playable) {
        item.type = 'button'
        item.disabled = !connected
        item.dataset.index = String(row.index)
        item.setAttribute('aria-label', T('playTrack', { title: row.title || T('untitled') }))
        var revision = queue.revision
        item.addEventListener('click', function () {
          if (!connected) return
          tap()
          send({ action: 'playIndex', index: row.index, revision: revision }).then(function (res) {
            if (res && !res.ok)
              $('queue-note').textContent = res.status === 409 ? T('queueChanged') : T('cantPlay')
          })
        })
      }
      li.appendChild(item)
      fragment.appendChild(li)
    })
    list.replaceChildren(fragment)
    list.scrollTop = scroll
    if (queueSheet.open && indexToRestore !== null) {
      var replacement = list.querySelector('button[data-index="' + indexToRestore + '"]')
      if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true })
    }
    $('queue-note').textContent = !connected
      ? T('offline')
      : !rows.length
        ? T('noTracks')
        : queue.total > rows.length
          ? T('showing', { n: rows.length, total: queue.total })
          : ''
  }

  // ---- Pairing -----------------------------------------------------------------------------

  function paintCode() {
    var v = el.pairCode.value
    for (var i = 0; i < 6; i++) {
      el.codeCells[i].textContent = v[i] || ''
      el.codeCells[i].classList.toggle(
        'at',
        document.activeElement === el.pairCode && i === Math.min(v.length, 5)
      )
    }
  }
  el.pairCode.addEventListener('input', function () {
    el.pairCode.value = el.pairCode.value.replace(/\D/g, '').slice(0, 6)
    el.pairNote.textContent = ''
    paintCode()
    if (el.pairCode.value.length === 6) el.pairForm.requestSubmit()
  })
  el.pairCode.addEventListener('focus', paintCode)
  el.pairCode.addEventListener('blur', paintCode)
  el.pairForm.addEventListener('submit', function (e) {
    e.preventDefault()
    var code = el.pairCode.value
    if (code.length !== 6) {
      el.pairNote.textContent = T('sixDigits')
      return
    }
    el.pairGo.disabled = true
    fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    })
      .then(function (res) {
        if (res.ok) return res.json()
        throw new Error(res.status === 401 ? 'wrong' : res.status === 429 ? 'wait' : 'off')
      })
      .then(function (body) {
        key = body.key
        try {
          localStorage.setItem(KEY_STORE, key)
        } catch {
          // storage blocked (private mode): the key lasts this visit only
        }
        el.pairCode.value = ''
        paintCode()
        connect()
      })
      .catch(function (err) {
        var why = err && err.message
        el.pairNote.textContent =
          why === 'wrong' ? T('wrong') : why === 'wait' ? T('wait') : T('noAnswer')
        el.codeBox.classList.remove('bad')
        void el.codeBox.offsetWidth
        el.codeBox.classList.add('bad')
        if (navigator.vibrate) navigator.vibrate([20, 40, 20])
        el.pairCode.value = ''
        paintCode()
      })
      .then(function () {
        el.pairGo.disabled = false
      })
  })
  el.goneRetry.addEventListener('click', function () {
    key = readKey()
    connect()
  })

  // ---- Battery: no stream and no clock while the page is out of sight. -------------------

  var timer = 0
  function startClock() {
    if (!timer) timer = setInterval(tick, 250)
  }
  function stopClock() {
    clearInterval(timer)
    timer = 0
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      connected = false
      renderQueue()
      stopClock()
      if (events) events.close()
      events = null
      clearTimeout(retryTimer)
    } else {
      startClock()
      connect()
    }
  })
  // Back on Wi-Fi, or the page restored from the browser's back/forward cache: try at once
  // instead of waiting out a retry.
  function reconnectNow() {
    if (document.hidden || connected) return
    misses = 0
    connect()
  }
  window.addEventListener('online', reconnectNow)
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) reconnectNow()
  })

  el.lookOpen.hidden = true
  paintWords()
  setShowLyrics(showLyrics)
  startClock()
  connect()
})()
