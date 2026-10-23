import * as THREE from 'three';
import { LESSONS, introLine } from './lessons.js';
import { sfx, unlockAudio, setMusic, isMusicOn } from './audio.js';
import './game.css';

/**
 * Game layer: start screen, HUD, mission board and role-play scenes where Bim
 * plays the other person and you answer by tapping or speaking.
 */

const STORE_KEY = 'machi-progress-v1';
const XP_PER_LEVEL = 100;

function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (p && typeof p.xp === 'number') return { xp: p.xp, stars: p.stars || {}, romaji: p.romaji ?? true, english: p.english ?? true, voice: p.voice ?? false, music: p.music ?? true };
  } catch {
    /* storage unavailable: play without saving */
  }
  return { xp: 0, stars: {}, romaji: true, english: true, voice: false, music: true };
}

function saveProgress(p) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

// --- Voice answers --------------------------------------------------------------

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function listen() {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new Error('unsupported'));
    const r = new Recognition();
    r.lang = 'ja-JP';
    r.interimResults = false;
    r.maxAlternatives = 5;
    let done = false;
    r.onresult = (e) => {
      done = true;
      resolve([...e.results[0]].map((a) => a.transcript));
    };
    r.onerror = (e) => {
      done = true;
      reject(new Error(e.error || 'error'));
    };
    r.onend = () => {
      if (!done) resolve([]);
    };
    try {
      window.speechSynthesis?.cancel();
      r.start();
    } catch (err) {
      reject(err);
    }
  });
}

const normalize = (s) => s.replace(/[。、！？!?.,\s「」・〜~]/g, '').toLowerCase();
function similarity(a, b) {
  a = normalize(a);
  b = normalize(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const grams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) || 0) + 1);
    return m;
  };
  const A = grams(a),
    B = grams(b);
  let hit = 0;
  for (const [g, n] of A) hit += Math.min(n, B.get(g) || 0);
  return (2 * hit) / Math.max(1, a.length - 1 + b.length - 1);
}

/** Which option did the player say? Returns {option, score, heard}. */
function matchSpeech(transcripts, options) {
  let best = { option: null, score: 0, heard: transcripts[0] || '' };
  for (const t of transcripts) {
    for (const opt of options) {
      const s = similarity(t, opt.jp);
      if (s > best.score) best = { option: opt, score: s, heard: t };
    }
  }
  return best.score >= 0.42 ? best : { option: null, score: best.score, heard: best.heard };
}

// --- Game ------------------------------------------------------------------------

export function createGame({ stage, bim, city, locations, speak, ui }) {
  const progress = loadProgress();
  const LOC = Object.fromEntries(locations.map((l) => [l.id, l]));
  const missionIds = locations.map((l) => l.id).filter((id) => LESSONS[id]);
  let voiceBlocked = false;
  let active = null; // running mission token

  // ---- HUD ----
  const hud = el(`
    <div class="hud" role="status">
      <button class="hud-level" title="Open the stamp book"><b class="lv"></b><span class="bar"><i></i></span><span class="xp"></span></button>
      <button class="hud-stamps" title="Open the stamp book">🏮 <span class="count"></span></button>
    </div>`);
  document.body.append(hud);
  const updateHud = () => {
    const lv = Math.floor(progress.xp / XP_PER_LEVEL) + 1;
    hud.querySelector('.lv').textContent = `Lv ${lv}`;
    hud.querySelector('.bar i').style.width = `${progress.xp % XP_PER_LEVEL}%`;
    hud.querySelector('.xp').textContent = `${progress.xp} XP`;
    hud.querySelector('.count').textContent = `${Object.keys(progress.stars).length}/${missionIds.length}`;
  };
  hud.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => openBoard()));

  // ---- Toolbar additions: missions, music, fullscreen ----
  const toolbar = document.querySelector('.toolbar');
  const btnBoard = el(`<button id="btn-missions">📜 Missions</button>`);
  const btnMusic = el(`<button id="btn-music" aria-pressed="false">🎵</button>`);
  const btnFull = el(`<button id="btn-full" title="Fullscreen">⛶</button>`);
  toolbar.prepend(btnBoard);
  toolbar.append(btnMusic, btnFull);
  btnBoard.onclick = () => openBoard();
  const syncMusicBtn = () => {
    btnMusic.textContent = isMusicOn() ? '🎵 On' : '🎵 Off';
    btnMusic.setAttribute('aria-pressed', String(isMusicOn()));
  };
  btnMusic.onclick = () => {
    unlockAudio();
    progress.music = !isMusicOn();
    setMusic(progress.music);
    saveProgress(progress);
    syncMusicBtn();
  };
  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.()?.catch?.(() => {});
    } catch {
      /* fullscreen not allowed here */
    }
  };
  btnFull.onclick = toggleFullscreen;
  syncMusicBtn();

  // ---- Start screen ----
  const start = el(`
    <div class="start-screen">
      <div class="start-card">
        <div class="start-hanko">街</div>
        <h1>Machi de Nihongo</h1>
        <p class="start-jp" lang="ja">街で日本語</p>
        <p class="start-lead">Bim, your samurai robot sensei, plays the people you'll meet in Japan. Listen, answer, and collect a stamp at every place.</p>
        <div class="start-actions">
          <button class="start-play">▶ Play</button>
          <button class="start-explore">Just explore</button>
        </div>
        <div class="start-options">
          <label><input type="checkbox" id="opt-music" /> Music</label>
          <label><input type="checkbox" id="opt-voice" /> Answer by speaking 🎤</label>
          <label><input type="checkbox" id="opt-full" checked /> Fullscreen</label>
        </div>
        <p class="start-note"></p>
      </div>
    </div>`);
  document.body.append(start);
  const optMusic = start.querySelector('#opt-music');
  const optVoice = start.querySelector('#opt-voice');
  const optFull = start.querySelector('#opt-full');
  optMusic.checked = progress.music;
  optVoice.checked = progress.voice && !!Recognition;
  if (!Recognition) {
    optVoice.disabled = true;
    optVoice.parentElement.title = 'Speech recognition is not available in this browser. Try Chrome or Edge.';
  }
  const note = start.querySelector('.start-note');
  note.textContent = progress.xp ? `Welcome back! You have ${progress.xp} XP and ${Object.keys(progress.stars).length} stamps.` : 'Tip: turn your sound on. Bim speaks every line.';

  const begin = (play) => {
    unlockAudio();
    // Prime speech synthesis inside the click (needed on iOS/Safari)
    try {
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(''));
    } catch {
      /* no speech */
    }
    progress.music = optMusic.checked;
    progress.voice = optVoice.checked;
    saveProgress(progress);
    setMusic(progress.music);
    syncMusicBtn();
    if (optFull.checked) toggleFullscreen();
    start.classList.add('gone');
    setTimeout(() => start.remove(), 600);
    document.body.classList.add('playing');
    if (play) openBoard();
  };
  start.querySelector('.start-play').onclick = () => begin(true);
  start.querySelector('.start-explore').onclick = () => begin(false);

  // ---- Mission board (stamp book) ----
  const board = el(`<div class="board" hidden><div class="board-card"><button class="close" aria-label="Close">×</button><h2>Stamp book <span lang="ja">御朱印帳</span></h2><p class="board-sub">Pick a place. Bim will meet you there.</p><div class="board-grid"></div></div></div>`);
  document.body.append(board);
  board.querySelector('.close').onclick = () => (board.hidden = true);
  board.addEventListener('click', (e) => e.target === board && (board.hidden = true));
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  function openBoard() {
    sfx.tap();
    const grid = board.querySelector('.board-grid');
    grid.innerHTML = missionIds
      .map((id) => {
        const l = LOC[id];
        const s = progress.stars[id] || 0;
        return `<button class="mission ${s ? 'done' : ''} ${l.district}" data-id="${id}">
          <span class="m-stamp" lang="ja">${s ? l.jp : ''}</span>
          <b lang="ja">${l.jp}</b><span class="m-en">${esc(l.en)}</span>
          <span class="m-stars">${s ? stars(s) : 'New'}</span></button>`;
      })
      .join('');
    grid.querySelectorAll('.mission').forEach((b) => (b.onclick = () => startMission(b.dataset.id)));
    board.hidden = false;
  }

  // ---- Dialogue panel ----
  const dlg = el(`
    <div class="dialogue" hidden>
      <div class="dlg-top">
        <span class="dlg-who"></span>
        <span class="dlg-step"></span>
        <span class="dlg-tools">
          <button class="t-romaji" title="Show romaji">ro</button>
          <button class="t-en" title="Show English">EN</button>
          <button class="t-replay" title="Hear it again">🔊</button>
          <button class="t-leave" title="Leave the scene">✕</button>
        </span>
      </div>
      <div class="dlg-line">
        <div class="l-jp" lang="ja"></div>
        <div class="l-ro"></div>
        <div class="l-en"></div>
      </div>
      <div class="dlg-goal"></div>
      <div class="dlg-options"></div>
      <div class="dlg-voice"><button class="mic">🎤 Say it</button><span class="heard"></span></div>
      <div class="dlg-feedback" aria-live="polite"></div>
    </div>`);
  document.body.append(dlg);
  const $d = (s) => dlg.querySelector(s);
  const applyToggles = () => {
    dlg.classList.toggle('no-romaji', !progress.romaji);
    dlg.classList.toggle('no-en', !progress.english);
    $d('.t-romaji').classList.toggle('on', progress.romaji);
    $d('.t-en').classList.toggle('on', progress.english);
  };
  $d('.t-romaji').onclick = () => {
    progress.romaji = !progress.romaji;
    saveProgress(progress);
    applyToggles();
  };
  $d('.t-en').onclick = () => {
    progress.english = !progress.english;
    saveProgress(progress);
    applyToggles();
  };
  $d('.t-leave').onclick = () => endMission();
  applyToggles();

  let currentLine = null;
  $d('.t-replay').onclick = () => currentLine && bimSay(currentLine.jp);

  function showLine(who, line) {
    currentLine = line;
    $d('.dlg-who').textContent = who;
    $d('.l-jp').textContent = line.jp;
    $d('.l-ro').textContent = line.romaji || '';
    $d('.l-en').textContent = line.en || '';
  }

  const bimTalk = (extra = {}) => ({ pitch: 1.45, rate: 0.9, ...extra, onStart: () => bim.setTalking(true), onEnd: () => (bim.setTalking(false), extra.onEnd?.()) });
  const bimSay = (text) => new Promise((res) => speak(text, bimTalk({ onEnd: res })));
  const youSay = (text) => new Promise((res) => speak(text, { pitch: 1.0, rate: 0.9, onEnd: res }));

  // ---- Placing Bim on the ground at a scene ----
  const ray = new THREE.Raycaster();
  function groundAt(x, z) {
    ray.set(new THREE.Vector3(x, 40, z), new THREE.Vector3(0, -1, 0));
    ray.far = 60;
    const hits = ray.intersectObject(city, true).filter((h) => h.point.y < 3 && !h.object.material?.transparent);
    return hits.length ? hits[0].point.y : 0.1;
  }
  let pop = null;
  function placeBim(x, z, yaw) {
    bim.root.position.set(x, groundAt(x, z), z);
    bim.root.rotation.y = yaw;
    bim.face(yaw);
    pop = { t: 0 };
  }

  // ---- Missions ----
  async function startMission(id) {
    const lesson = LESSONS[id];
    const loc = LOC[id];
    if (!lesson || !loc) return;
    board.hidden = true;
    ui.closeCard?.();
    const token = (active = { id, mistakes: 0, earned: 0 });
    stage.follow(null);
    const facing = lesson.facing || loc.facing || [0, 1];
    const yaw = Math.atan2(facing[0], facing[1]);
    const [x, z] = lesson.spot;
    placeBim(x, z, yaw);
    // aim at his feet so he sits in the upper half, clear of the dialogue box
    stage.flyTo(new THREE.Vector3(x, bim.root.position.y + 0.1, z), 8, 1.6, facing, 0.24, 0.35);
    dlg.hidden = false;
    dlg.classList.remove('finished');
    $d('.dlg-options').innerHTML = '';
    $d('.dlg-goal').textContent = '';
    $d('.dlg-feedback').textContent = '';
    $d('.dlg-voice').hidden = true;
    $d('.dlg-step').textContent = `${loc.jp} · ${loc.en}`;
    showLine('ビム Bim', { ...introLine(loc, lesson), romaji: '' });
    await wait(1500);
    if (active !== token) return;
    bim.play('bow');
    await bimSay(introLine(loc, lesson).jp);

    for (let i = 0; i < lesson.turns.length; i++) {
      if (active !== token) return;
      const turn = lesson.turns[i];
      $d('.dlg-step').textContent = `${loc.jp} · ${i + 1}/${lesson.turns.length}`;
      showLine(`${lesson.role.jp} (Bim)`, turn.npc);
      $d('.dlg-options').innerHTML = '';
      $d('.dlg-feedback').textContent = '';
      $d('.dlg-goal').textContent = '';
      await bimSay(turn.npc.jp);
      if (active !== token) return;
      const ok = await askTurn(turn, token);
      if (!ok) return;
    }
    if (active !== token) return;
    await finishMission(id, token);
  }

  /** Show the options and wait until the player gives the right answer. */
  function askTurn(turn, token) {
    return new Promise((resolve) => {
      let tries = 0;
      const options = shuffle(turn.options);
      $d('.dlg-goal').innerHTML = `<span class="goal-tag">Your turn</span> ${esc(turn.goal)}`;
      const box = $d('.dlg-options');
      box.innerHTML = options
        .map((op, k) => `<button class="opt" data-k="${k}"><span class="o-jp" lang="ja">${esc(op.jp)}</span><span class="o-ro">${esc(op.romaji)}</span><span class="o-en">${esc(op.en)}</span></button>`)
        .join('');
      const voiceRow = $d('.dlg-voice');
      voiceRow.hidden = !(progress.voice && Recognition && !voiceBlocked);
      $d('.heard').textContent = '';

      let busy = false;
      const choose = async (op, btn) => {
        if (busy || active !== token) return;
        busy = true;
        if (op.ok) {
          sfx.correct();
          btn?.classList.add('right');
          const gain = tries === 0 ? 10 : 5;
          token.earned += gain;
          $d('.dlg-feedback').innerHTML = `<b class="good">正解！ Correct!</b> +${gain} XP`;
          box.querySelectorAll('.opt').forEach((b) => (b.disabled = true));
          voiceRow.hidden = true;
          await youSay(op.jp);
          bim.play('nod');
          await wait(500);
          resolve(active === token);
        } else {
          sfx.wrong();
          tries++;
          token.mistakes++;
          btn?.classList.add('wrong');
          if (btn) btn.disabled = true;
          const hint = tries >= 2 ? ` The answer is <b lang="ja">${esc(options.find((x) => x.ok).jp)}</b>.` : '';
          $d('.dlg-feedback').innerHTML = `<b class="bad">ちがいます</b> ${esc(op.tip || 'Not quite.')}${hint}`;
          bim.play('nod');
          busy = false;
        }
      };
      box.querySelectorAll('.opt').forEach((b) => (b.onclick = () => choose(options[+b.dataset.k], b)));

      $d('.mic').onclick = async () => {
        if (busy) return;
        const mic = $d('.mic');
        mic.classList.add('listening');
        mic.textContent = '👂 Listening…';
        $d('.heard').textContent = '';
        try {
          const heard = await listen();
          const m = matchSpeech(heard, options);
          $d('.heard').textContent = heard.length ? `Heard: 「${heard[0]}」` : 'I heard nothing. Try again.';
          if (m.option) {
            const idx = options.indexOf(m.option);
            choose(m.option, box.querySelector(`.opt[data-k="${idx}"]`));
          } else if (heard.length) {
            $d('.dlg-feedback').innerHTML = `<b class="bad">もう一度</b> Bim didn't catch that. Try again, or tap an answer.`;
          }
        } catch (err) {
          if (/not-allowed|service-not-allowed|audio-capture/.test(err.message)) {
            voiceBlocked = true;
            voiceRow.hidden = true;
            $d('.dlg-feedback').textContent = "The microphone isn't available here, so tap your answer instead.";
          } else {
            $d('.heard').textContent = 'Could not hear you. Try again.';
          }
        } finally {
          mic.classList.remove('listening');
          mic.textContent = '🎤 Say it';
        }
      };
    });
  }

  async function finishMission(id, token) {
    const loc = LOC[id];
    const starsEarned = token.mistakes === 0 ? 3 : token.mistakes <= 2 ? 2 : 1;
    const before = Math.floor(progress.xp / XP_PER_LEVEL);
    const bonus = 20;
    progress.xp += token.earned + bonus;
    progress.stars[id] = Math.max(progress.stars[id] || 0, starsEarned);
    saveProgress(progress);
    updateHud();
    bim.play('cheer');
    sfx.stamp();
    dlg.classList.add('finished');
    $d('.dlg-goal').textContent = '';
    showLine('ビム Bim', { jp: 'よくできました！', romaji: 'Yoku dekimashita!', en: 'Well done!' });
    $d('.dlg-options').innerHTML = `
      <div class="stamp-result">
        <div class="stamp" lang="ja">${loc.jp}</div>
        <div><div class="sr-stars">${stars(starsEarned)}</div><div class="sr-xp">+${token.earned + bonus} XP</div></div>
      </div>
      <div class="sr-actions"><button class="next">Next place ▶</button><button class="again">Play again</button><button class="explore">Explore</button></div>`;
    $d('.dlg-feedback').textContent = '';
    if (Math.floor(progress.xp / XP_PER_LEVEL) > before) {
      setTimeout(() => sfx.levelUp(), 700);
      $d('.dlg-feedback').innerHTML = `<b class="good">レベルアップ！ Level up!</b> You're now level ${Math.floor(progress.xp / XP_PER_LEVEL) + 1}.`;
    }
    const nextId = missionIds.find((m) => !progress.stars[m]) || missionIds[(missionIds.indexOf(id) + 1) % missionIds.length];
    $d('.next').onclick = () => startMission(nextId);
    $d('.again').onclick = () => startMission(id);
    $d('.explore').onclick = () => endMission();
    bimSay('よくできました！');
    active = null;
  }

  function endMission() {
    active = null;
    window.speechSynthesis?.cancel();
    bim.setTalking(false);
    dlg.hidden = true;
  }

  updateHud();

  return {
    start: startMission,
    hasLesson: (id) => !!LESSONS[id],
    openBoard,
    update(dt) {
      if (pop) {
        // little pop-in when Bim arrives at a scene
        pop.t += dt;
        const k = Math.min(1, pop.t / 0.45);
        bim.root.scale.setScalar(0.85 * (k < 1 ? Math.sin(k * Math.PI * 0.5) * (1 + 0.15 * Math.sin(k * Math.PI)) : 1));
        if (k >= 1) pop = null;
      }
    },
  };
}
