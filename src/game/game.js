import * as THREE from 'three';
import { LESSONS } from './lessons.js';
import { createTutor } from './tutor.js';
import { sfx, unlockAudio, setMusic, isMusicOn } from './audio.js';
import { createNPC } from '../trainer/npc.js';
import { japaneseVoices } from '../ui.js';
import './game.css';

/**
 * Game layer: start screen, HUD, stamp book and conversation scenes.
 *
 * A scene at each place has three characters: you, Bim (your interpreter)
 * and the person who works there. Each exchange goes:
 *   1. you say (or type) what you want in English
 *   2. Bim says it in Japanese
 *   3. you repeat it in Japanese and get a pronunciation score
 *   4. the person answers in Japanese, with English subtitles
 */

const STORE_KEY = 'machi-progress-v1';
const XP_PER_LEVEL = 100;
const MAX_EXCHANGES = 4;

function loadProgress() {
  const base = { xp: 0, stars: {}, romaji: true, english: true, voice: true, music: true };
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (p && typeof p.xp === 'number') return { ...base, ...p, stars: p.stars || {} };
  } catch {
    /* storage unavailable: play without saving */
  }
  return base;
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
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Listening ------------------------------------------------------------------

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function listen(lang) {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new Error('unsupported'));
    const r = new Recognition();
    r.lang = lang;
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
    r.onend = () => !done && resolve([]);
    try {
      window.speechSynthesis?.cancel();
      r.start();
    } catch (err) {
      reject(err);
    }
  });
}

const normalize = (s) => s.replace(/[。、！？!?.,\s「」・〜~]/g, '').toLowerCase();
/** Character-bigram overlap between two Japanese strings (0–1). */
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

// --- Game -----------------------------------------------------------------------

export function createGame({ stage, bim, city, locations, speak, ui }) {
  const progress = loadProgress();
  const tutor = createTutor();
  const LOC = Object.fromEntries(locations.map((l) => [l.id, l]));
  const missionIds = locations.map((l) => l.id).filter((id) => LESSONS[id]);
  const npc = createNPC();
  stage.scene.add(npc.root);
  let micBlocked = false;
  let scene = null; // the running conversation

  // ---- HUD ----
  const hud = el(`
    <div class="hud" role="status">
      <button class="hud-level" title="Open the stamp book"><b class="lv"></b><span class="bar"><i></i></span><span class="xp"></span></button>
      <button class="hud-stamps" title="Open the stamp book">🏮 <span class="count"></span></button>
    </div>`);
  document.body.append(hud);
  const updateHud = () => {
    hud.querySelector('.lv').textContent = `Lv ${Math.floor(progress.xp / XP_PER_LEVEL) + 1}`;
    hud.querySelector('.bar i').style.width = `${progress.xp % XP_PER_LEVEL}%`;
    hud.querySelector('.xp').textContent = `${progress.xp} XP`;
    hud.querySelector('.count').textContent = `${Object.keys(progress.stars).length}/${missionIds.length}`;
  };
  hud.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => openBoard()));

  // ---- Toolbar: missions, music, fullscreen ----
  const toolbar = document.querySelector('.toolbar');
  const btnBoard = el(`<button id="btn-missions">📜 Missions</button>`);
  const btnMusic = el(`<button id="btn-music"></button>`);
  const btnFull = el(`<button id="btn-full" title="Fullscreen">⛶</button>`);
  toolbar.prepend(btnBoard);
  toolbar.append(btnMusic, btnFull);
  btnBoard.onclick = () => openBoard();
  const syncMusicBtn = () => (btnMusic.textContent = isMusicOn() ? '🎵 On' : '🎵 Off');
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
        <p class="start-lead">Say what you want in English. Bim turns it into Japanese, you repeat it, and the people of the town answer you.</p>
        <div class="start-actions">
          <button class="start-play">▶ Play</button>
          <button class="start-explore">Just explore</button>
        </div>
        <div class="start-options">
          <label><input type="checkbox" id="opt-music" /> Music</label>
          <label><input type="checkbox" id="opt-voice" /> Use my microphone 🎤</label>
          <label><input type="checkbox" id="opt-full" checked /> Fullscreen</label>
        </div>
        <div class="engine">
          <div class="engine-status">Checking the conversation engine…</div>
          <form class="engine-key" hidden>
            <label for="opt-key">Anthropic API key <span>(optional, stays in this browser)</span></label>
            <div><input id="opt-key" type="password" autocomplete="off" placeholder="sk-ant-…" /><button type="submit">Save</button></div>
          </form>
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
    optVoice.parentElement.title = 'Speech recognition needs Chrome or Edge.';
  }
  start.querySelector('.start-note').textContent = progress.xp
    ? `Welcome back! ${progress.xp} XP, ${Object.keys(progress.stars).length} stamps.`
    : 'Turn your sound on: Bim and the townspeople speak every line.';

  const engineText = {
    claude: '✨ Conversations use Claude through your account. You can say anything.',
    api: '✨ Conversations use Claude with your API key. You can say anything.',
    offline: '📖 Offline phrasebook: Bim knows the key phrases for each place. Add an API key to say anything.',
  };
  const showEngine = async () => {
    const mode = await tutor.mode();
    start.querySelector('.engine-status').textContent = engineText[mode];
    start.querySelector('.engine-key').hidden = mode === 'claude';
  };
  showEngine();
  start.querySelector('.engine-key').addEventListener('submit', (e) => {
    e.preventDefault();
    tutor.setKey(start.querySelector('#opt-key').value);
    start.querySelector('#opt-key').value = '';
    showEngine();
  });

  const begin = (play) => {
    unlockAudio();
    try {
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance('')); // unlock speech on iOS/Safari
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

  // ---- Stamp book ----
  const board = el(`<div class="board" hidden><div class="board-card"><button class="close" aria-label="Close">×</button><h2>Stamp book <span lang="ja">御朱印帳</span></h2><p class="board-sub">Pick a place. Bim will meet you there.</p><div class="board-grid"></div></div></div>`);
  document.body.append(board);
  board.querySelector('.close').onclick = () => (board.hidden = true);
  board.addEventListener('click', (e) => e.target === board && (board.hidden = true));
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  function openBoard() {
    sfx.tap();
    board.querySelector('.board-grid').innerHTML = missionIds
      .map((id) => {
        const l = LOC[id];
        const s = progress.stars[id] || 0;
        return `<button class="mission ${s ? 'done' : ''}" data-id="${id}">
          <span class="m-stamp" lang="ja">${s ? l.jp : ''}</span>
          <b lang="ja">${l.jp}</b><span class="m-en">${esc(l.en)}</span>
          <span class="m-who">with the ${esc(LESSONS[id].role.en)}</span>
          <span class="m-stars">${s ? stars(s) : 'New'}</span></button>`;
      })
      .join('');
    board.querySelectorAll('.mission').forEach((b) => (b.onclick = () => startScene(b.dataset.id)));
    board.hidden = false;
  }

  // ---- Dialogue box ----
  const dlg = el(`
    <div class="dialogue" hidden>
      <div class="dlg-top">
        <span class="dlg-who"></span>
        <span class="dlg-step"></span>
        <span class="dlg-tools">
          <button class="t-romaji" title="Show romaji">ro</button>
          <button class="t-en" title="Show English subtitles">EN</button>
          <button class="t-replay" title="Hear it again">🔊</button>
          <button class="t-leave" title="Leave the scene">✕</button>
        </span>
      </div>
      <div class="dlg-line">
        <div class="l-jp" lang="ja"></div>
        <div class="l-ro"></div>
        <div class="l-en"></div>
      </div>
      <div class="dlg-stage"></div>
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
  $d('.t-romaji').onclick = () => ((progress.romaji = !progress.romaji), saveProgress(progress), applyToggles());
  $d('.t-en').onclick = () => ((progress.english = !progress.english), saveProgress(progress), applyToggles());
  $d('.t-leave').onclick = () => endScene();
  applyToggles();

  let lastLine = null;
  $d('.t-replay').onclick = () => lastLine && lastLine.say();
  function showLine(who, kind, line, sayFn) {
    $d('.dlg-who').textContent = who;
    $d('.dlg-who').dataset.kind = kind;
    $d('.l-jp').textContent = line.jp;
    $d('.l-ro').textContent = line.romaji || '';
    $d('.l-en').textContent = line.en || '';
    lastLine = { say: sayFn };
  }
  const setStage = (html) => ($d('.dlg-stage').innerHTML = html);
  const feedback = (html) => ($d('.dlg-feedback').innerHTML = html);

  // ---- Voices ----
  const voices = () => {
    const v = japaneseVoices();
    return { bim: v[0] || null, npc: v[1] || v[0] || null };
  };
  const bimSay = (text) =>
    new Promise((res) => speak(text, { pitch: 1.45, rate: 0.9, voice: voices().bim, onStart: () => bim.setTalking(true), onEnd: () => (bim.setTalking(false), res()) }));
  const npcSay = (text) =>
    new Promise((res) => speak(text, { pitch: npc.pitch, rate: 0.92, voice: voices().npc, onStart: () => npc.setTalking(true), onEnd: () => (npc.setTalking(false), res()) }));

  // ---- Placing the characters ----
  const ray = new THREE.Raycaster();
  function groundAt(x, z) {
    ray.set(new THREE.Vector3(x, 40, z), new THREE.Vector3(0, -1, 0));
    ray.far = 60;
    const hits = ray.intersectObject(city, true).filter((h) => h.point.y < 3 && !h.object.material?.transparent);
    return hits.length ? hits[0].point.y : 0.1;
  }
  /**
   * Pick a camera direction around the scene with a clear view: start from the
   * place's entrance side and swing round until nothing blocks the line of
   * sight to the characters.
   */
  const CAM_DIST = 9.5;
  function clearYaw(x, y, z, baseYaw) {
    const from = new THREE.Vector3();
    const dir = new THREE.Vector3();
    for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.5, -2.5, Math.PI]) {
      const yaw = baseYaw + off;
      let blocked = false;
      for (const side of [-1.3, 0, 1.3]) {
        // look from each character's head towards the camera spot
        from.set(x + Math.cos(yaw) * side, y + 1.4, z - Math.sin(yaw) * side);
        const cam = new THREE.Vector3(x + Math.sin(yaw) * CAM_DIST, y + 2.6, z + Math.cos(yaw) * CAM_DIST);
        dir.subVectors(cam, from);
        ray.set(from, dir.clone().normalize());
        ray.far = dir.length();
        if (ray.intersectObject(city, true).some((h) => !h.object.material?.transparent)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return yaw;
    }
    return baseYaw;
  }

  let pop = null;
  function placeCast(id) {
    const lesson = LESSONS[id];
    const loc = LOC[id];
    const entrance = lesson.facing || loc.facing || [0, 1];
    const [sx, sz] = lesson.spot;
    const yaw = clearYaw(sx, groundAt(sx, sz), sz, Math.atan2(entrance[0], entrance[1]));
    const facing = [Math.sin(yaw), Math.cos(yaw)];
    // screen-right as seen from the camera, which looks back along `facing`
    const right = new THREE.Vector2(facing[1], -facing[0]);
    const bx = sx - right.x * 1.3,
      bz = sz - right.y * 1.3;
    const nx = sx + right.x * 1.3,
      nz = sz + right.y * 1.3;
    bim.root.position.set(bx, groundAt(bx, bz), bz);
    bim.root.rotation.y = yaw + 0.35;
    bim.face(yaw + 0.35);
    npc.dress(id, missionIds.indexOf(id));
    npc.root.position.set(nx, groundAt(nx, nz), nz);
    npc.root.rotation.y = yaw - 0.35;
    pop = { t: 0 };
    stage.follow(null);
    stage.flyTo(new THREE.Vector3(sx, bim.root.position.y + 0.3, sz), CAM_DIST, 1.6, facing, 0.26, 0);
  }

  // ---- Scenes ----
  async function startScene(id) {
    const lesson = LESSONS[id];
    const loc = LOC[id];
    if (!lesson || !loc) return;
    board.hidden = true;
    ui.closeCard?.();
    window.speechSynthesis?.cancel();
    const sc = (scene = { id, loc, lesson, history: [], scores: [], xp: 0, exchanges: 0 });
    placeCast(id);
    dlg.hidden = false;
    dlg.classList.remove('finished');
    feedback('');
    $d('.dlg-step').textContent = `${loc.jp} · ${loc.en}`;
    const mode = await tutor.mode();
    const intro = {
      jp: `${loc.jp}に着きました！`,
      romaji: '',
      en: `We're at the ${loc.en.toLowerCase()}. Tell me in English what you want to say, and I'll teach you the Japanese.`,
    };
    showLine('ビム Bim', 'bim', intro, () => bimSay(intro.jp));
    setStage(`<p class="stage-note">${mode === 'offline' ? '📖 Offline phrasebook' : '✨ Claude is your interpreter'}</p>`);
    await wait(1400);
    if (scene !== sc) return;
    bim.play('wave');
    await bimSay(intro.jp);
    if (scene !== sc) return;
    // The person who works here opens the conversation
    const opening = lesson.turns[0].npc;
    npc.play('bow');
    showLine(`${lesson.role.jp} · ${lesson.role.en}`, 'npc', opening, () => npcSay(opening.jp));
    sc.history.push({ who: 'npc', jp: opening.jp, en: opening.en });
    await npcSay(opening.jp);
    if (scene !== sc) return;
    askEnglish(sc);
  }

  /** Step 1: what do you want to say? (speech or typing) */
  function askEnglish(sc) {
    const sugg = tutor.suggestions(sc.id, sc.loc);
    const canMic = progress.voice && Recognition && !micBlocked;
    setStage(`
      <div class="stage-label"><span class="goal-tag">Your turn</span> What do you want to say? Use English.</div>
      <form class="say-en">
        ${canMic ? '<button type="button" class="mic mic-en">🎤 Speak English</button>' : ''}
        <input id="en-text" type="text" autocomplete="off" placeholder="e.g. ${esc(sugg[0] || 'Hello!')}" aria-label="What you want to say, in English" />
        <button type="submit" class="send">Ask Bim</button>
      </form>
      <div class="chips">${sugg.map((s) => `<button type="button" class="chip">${esc(s)}</button>`).join('')}</div>`);
    feedback('');
    const input = $d('#en-text');
    const go = (text) => {
      text = text.trim();
      if (text && scene === sc) translate(sc, text);
    };
    $d('.say-en').onsubmit = (e) => (e.preventDefault(), go(input.value));
    $d('.dlg-stage').querySelectorAll('.chip').forEach((c) => (c.onclick = () => go(c.textContent)));
    const mic = $d('.mic-en');
    if (mic)
      mic.onclick = async () => {
        mic.classList.add('listening');
        mic.textContent = '👂 Listening…';
        try {
          const heard = await listen('en-US');
          if (heard[0]) {
            input.value = heard[0];
            go(heard[0]);
          } else feedback('I heard nothing. Try again or type it.');
        } catch (err) {
          micFailed(err);
        } finally {
          mic.classList.remove('listening');
          mic.textContent = '🎤 Speak English';
        }
      };
    if (!canMic) input.focus({ preventScroll: true });
  }

  function micFailed(err) {
    if (/not-allowed|service-not-allowed|audio-capture|unsupported/.test(err?.message || '')) {
      micBlocked = true;
      $d('.dlg-stage').querySelectorAll('.mic').forEach((b) => b.remove());
      feedback("The microphone isn't available here, so type instead.");
    } else feedback('Could not hear you. Try again.');
  }

  /** Step 2: Bim says it in Japanese. */
  async function translate(sc, english) {
    setStage(`<p class="stage-note thinking">Bim is working out the Japanese for “${esc(english)}”…</p>`);
    bim.play('nod');
    const r = await tutor.respond({ locId: sc.id, loc: sc.loc, history: sc.history, english });
    if (scene !== sc) return;
    if (r.miss) {
      const msg = { jp: 'ごめんなさい、まだわかりません。', romaji: 'Gomen nasai, mada wakarimasen.', en: "Sorry, I don't know that one yet. Try one of the suggestions." };
      showLine('ビム Bim', 'bim', msg, () => bimSay(msg.jp));
      bimSay(msg.jp);
      askEnglish(sc);
      return;
    }
    if (r.error) feedback(`${esc(r.error)} Using the offline phrasebook.`);
    showLine('ビム Bim · in Japanese', 'bim', r, () => bimSay(r.jp));
    setStage(`<p class="stage-note">You wanted to say: “${esc(english)}”${r.tip ? `<br><span class="tip">💡 ${esc(r.tip)}</span>` : ''}</p>`);
    bim.play('nod');
    await bimSay(r.jp);
    if (scene !== sc) return;
    askRepeat(sc, r);
  }

  /** Step 3: you repeat it in Japanese. */
  function askRepeat(sc, r) {
    const canMic = progress.voice && Recognition && !micBlocked;
    setStage(`
      <div class="stage-label"><span class="goal-tag">Your turn</span> Now say it in Japanese:</div>
      <div class="target"><span class="t-jp" lang="ja">${esc(r.jp)}</span><span class="t-ro">${esc(r.romaji)}</span></div>
      <div class="repeat-row">
        ${canMic ? '<button class="mic mic-ja">🎤 Say it</button>' : ''}
        <button class="again">🔊 Hear Bim again</button>
        <button class="selfcheck">${canMic ? 'Skip' : '✓ I said it out loud'}</button>
      </div>
      <div class="score" hidden><span class="score-bar"><i></i></span><span class="score-text"></span></div>`);
    feedback('');
    $d('.again').onclick = () => bimSay(r.jp);
    $d('.selfcheck').onclick = () => {
      sc.scores.push(canMic ? 0.4 : 0.7);
      reply(sc, r);
    };
    const mic = $d('.mic-ja');
    if (mic)
      mic.onclick = async () => {
        mic.classList.add('listening');
        mic.textContent = '👂 Listening…';
        try {
          const heard = await listen('ja-JP');
          const best = heard.reduce((b, h) => Math.max(b, similarity(h, r.jp)), 0);
          const pct = Math.round(best * 100);
          const box = $d('.score');
          box.hidden = false;
          box.querySelector('i').style.width = `${pct}%`;
          box.dataset.level = pct >= 75 ? 'great' : pct >= 45 ? 'good' : 'low';
          const verdict = pct >= 75 ? 'すばらしい！ Excellent!' : pct >= 45 ? 'いいですね！ Good, nearly there.' : 'もう一度！ Try once more.';
          box.querySelector('.score-text').innerHTML = `<b>${pct}%</b> ${verdict}${heard[0] ? ` <span class="heard">Heard: 「${esc(heard[0])}」</span>` : ''}`;
          if (pct >= 45) {
            sfx.correct();
            sc.scores.push(best);
            mic.remove();
            $d('.selfcheck').textContent = 'Continue ▶';
            $d('.selfcheck').onclick = () => reply(sc, r);
            if (pct >= 75) setTimeout(() => scene === sc && reply(sc, r), 1200);
          } else sfx.wrong();
        } catch (err) {
          micFailed(err);
          $d('.selfcheck').textContent = '✓ I said it out loud';
        } finally {
          if (mic.isConnected) {
            mic.classList.remove('listening');
            mic.textContent = '🎤 Say it again';
          }
        }
      };
  }

  /** Step 4: the person answers in Japanese with English subtitles. */
  async function reply(sc, r) {
    if (sc.replied === r) return; // guard double clicks
    sc.replied = r;
    const score = sc.scores.at(-1) ?? 0.5;
    const gain = 10 + Math.round(score * 10);
    sc.xp += gain;
    sc.exchanges++;
    sc.history.push({ who: 'you', jp: r.jp, en: r.en });
    setStage('');
    feedback(`+${gain} XP`);
    bim.play('nod');
    await wait(400);
    if (scene !== sc) return;
    const line = r.reply;
    npc.play('nod');
    showLine(`${sc.lesson.role.jp} · ${sc.lesson.role.en}`, 'npc', line, () => npcSay(line.jp));
    sc.history.push({ who: 'npc', jp: line.jp, en: line.en });
    await npcSay(line.jp);
    if (scene !== sc) return;
    if (r.end || sc.exchanges >= MAX_EXCHANGES) finishScene(sc);
    else askEnglish(sc);
  }

  async function finishScene(sc) {
    const avg = sc.scores.length ? sc.scores.reduce((a, b) => a + b, 0) / sc.scores.length : 0.5;
    const earned = avg >= 0.75 ? 3 : avg >= 0.5 ? 2 : 1;
    const before = Math.floor(progress.xp / XP_PER_LEVEL);
    const total = sc.xp + 20;
    progress.xp += total;
    progress.stars[sc.id] = Math.max(progress.stars[sc.id] || 0, earned);
    saveProgress(progress);
    updateHud();
    bim.play('cheer');
    npc.play('bow');
    sfx.stamp();
    dlg.classList.add('finished');
    const done = { jp: 'よくできました！', romaji: 'Yoku dekimashita!', en: 'Well done!' };
    showLine('ビム Bim', 'bim', done, () => bimSay(done.jp));
    const nextId = missionIds.find((m) => !progress.stars[m]) || missionIds[(missionIds.indexOf(sc.id) + 1) % missionIds.length];
    setStage(`
      <div class="stamp-result">
        <div class="stamp" lang="ja">${sc.loc.jp}</div>
        <div><div class="sr-stars">${stars(earned)}</div><div class="sr-xp">+${total} XP</div><div class="sr-sub">${sc.exchanges} exchanges · pronunciation ${Math.round(avg * 100)}%</div></div>
      </div>
      <div class="sr-actions"><button class="next">Next: ${esc(LOC[nextId].en)} ▶</button><button class="again">Play again</button><button class="explore">Explore</button></div>`);
    feedback(Math.floor(progress.xp / XP_PER_LEVEL) > before ? `<b class="good">レベルアップ！ Level up!</b> You're now level ${Math.floor(progress.xp / XP_PER_LEVEL) + 1}.` : '');
    if (Math.floor(progress.xp / XP_PER_LEVEL) > before) setTimeout(() => sfx.levelUp(), 700);
    $d('.next').onclick = () => startScene(nextId);
    $d('.again').onclick = () => startScene(sc.id);
    $d('.explore').onclick = () => endScene();
    bimSay(done.jp);
    scene = null;
  }

  function endScene() {
    scene = null;
    window.speechSynthesis?.cancel();
    bim.setTalking(false);
    npc.hide();
    dlg.hidden = true;
  }

  updateHud();

  return {
    start: startScene,
    hasLesson: (id) => !!LESSONS[id],
    openBoard,
    update(dt, t) {
      npc.update(dt, t);
      if (pop) {
        // little pop-in when the cast arrives at a scene
        pop.t += dt;
        const k = Math.min(1, pop.t / 0.45);
        const s = k < 1 ? Math.sin(k * Math.PI * 0.5) * (1 + 0.15 * Math.sin(k * Math.PI)) : 1;
        bim.root.scale.setScalar(0.85 * s);
        npc.root.scale.setScalar(s);
        if (k >= 1) pop = null;
      }
    },
  };
}
