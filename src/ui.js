// HTML overlay: place list, location card with phrases, day/night switch.

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

let jaVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  jaVoice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ja')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

/**
 * Speak Japanese with the browser voice. `onStart`/`onEnd` drive Bim's talking
 * animation; without speech support they still fire, timed to the text length.
 */
export function speak(text, { pitch = 1, rate = 0.85, onStart, onEnd } = {}) {
  if (!('speechSynthesis' in window)) {
    onStart?.();
    setTimeout(() => onEnd?.(), 400 + text.length * 120);
    return false;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  if (jaVoice) u.voice = jaVoice;
  u.rate = rate;
  u.pitch = pitch;
  let ended = false;
  const end = () => {
    if (!ended) (ended = true), onEnd?.();
  };
  u.onstart = () => onStart?.();
  u.onend = end;
  u.onerror = end;
  // Some browsers never fire onend when no Japanese voice exists
  setTimeout(end, 1500 + text.length * 250);
  onStart?.();
  speechSynthesis.speak(u);
  return true;
}

export function createUI({ locations, trainer, onSelect, onOverview, onNight, onMeetTrainer, onTrainerAction, onSpeak }) {
  const $ = (sel) => document.querySelector(sel);
  const list = $('#place-list');
  const card = $('#place-card');
  const loader = $('#loader');

  const groups = [
    ['old', '昔の町', 'Old town'],
    ['modern', '今の町', 'Modern city'],
    ['travel', '旅', 'Travel'],
    ['leisure', '遊び', 'Leisure & nature'],
  ];
  list.innerHTML =
    `<section class="trainer-entry">
      <h3><span>先生</span> Your trainer</h3>
      <button class="place trainer" data-id="trainer"><b>${trainer.jp}</b><span>${trainer.en}</span></button>
    </section>` +
    groups
    .map(
      ([d, jp, en]) => `
      <section>
        <h3><span>${jp}</span> ${en}</h3>
        ${locations
          .filter((l) => l.district === d)
          .map((l) => `<button class="place" data-id="${l.id}"><b>${l.jp}</b><span>${l.en}</span></button>`)
          .join('')}
      </section>`,
    )
    .join('');

  const phraseList = (phrases) => `
      <ul class="phrases">
        ${phrases
          .map(
            (p, i) => `
          <li>
            <button class="say" data-i="${i}" title="Listen">🔊</button>
            <div>
              <div class="p-jp" lang="ja">${p.jp}</div>
              <div class="p-ro">${esc(p.romaji)}</div>
              <div class="p-en">${esc(p.en)}</div>
            </div>
          </li>`,
          )
          .join('')}
      </ul>`;

  const showTrainer = () => {
    list.querySelectorAll('.place').forEach((b) => b.classList.toggle('active', b.dataset.id === 'trainer'));
    card.innerHTML = `
      <button class="close" aria-label="Close">×</button>
      <div class="card-head trainer">
        <div class="kanji">${trainer.jp}</div>
        <div>
          <div class="kana">${trainer.kana}</div>
          <div class="romaji">${trainer.romaji}</div>
          <div class="en">${trainer.en}</div>
        </div>
      </div>
      <p class="situation">${esc(trainer.intro)}</p>
      <h4>Bim says</h4>
      ${phraseList(trainer.phrases)}
      <h4>Moves</h4>
      <div class="moves">
        ${trainer.moves.map((m) => `<button data-move="${m.id}"><b lang="ja">${m.jp}</b><span>${m.en}</span></button>`).join('')}
      </div>
    `;
    card.classList.add('open');
    card.querySelector('.close').onclick = () => close();
    card.querySelectorAll('.say').forEach((b) => {
      b.onclick = () => onTrainerAction('say', trainer.phrases[+b.dataset.i]);
    });
    card.querySelectorAll('[data-move]').forEach((b) => {
      b.onclick = () => onTrainerAction(b.dataset.move);
    });
    document.body.classList.remove('list-open');
    onMeetTrainer();
  };

  const select = (id) => {
    if (id === 'trainer') return showTrainer();
    const loc = locations.find((l) => l.id === id);
    if (!loc) return;
    list.querySelectorAll('.place').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    card.innerHTML = `
      <button class="close" aria-label="Close">×</button>
      <div class="card-head ${loc.district}">
        <div class="kanji">${loc.jp}</div>
        <div>
          <div class="kana">${loc.kana}</div>
          <div class="romaji">${loc.romaji}</div>
          <div class="en">${loc.en}</div>
        </div>
      </div>
      <p class="situation"><span class="tag">Real-life situation</span>${esc(loc.situation)}</p>
      <h4>Key phrases</h4>
      ${phraseList(loc.phrases)}
      <div class="trainer-soon"><b>ビム先生</b> Bim will meet you here for role-play lessons — coming next.</div>
    `;
    card.classList.add('open');
    card.querySelector('.close').onclick = () => close();
    card.querySelectorAll('.say').forEach((b) => {
      b.onclick = () => {
        if (!speak(loc.phrases[+b.dataset.i].jp, onSpeak?.())) b.title = 'Speech not supported in this browser';
      };
    });
    document.body.classList.remove('list-open');
    onSelect(loc);
  };

  const close = () => {
    card.classList.remove('open');
    list.querySelectorAll('.place').forEach((b) => b.classList.remove('active'));
  };

  list.addEventListener('click', (e) => {
    const b = e.target.closest('.place');
    if (b) select(b.dataset.id);
  });

  const nightBtn = $('#btn-night');
  nightBtn.addEventListener('click', () => {
    const on = !document.body.classList.contains('night');
    document.body.classList.toggle('night', on);
    nightBtn.textContent = on ? '☀️ Day' : '🌙 Night';
    onNight(on);
  });
  $('#btn-overview').addEventListener('click', () => {
    close();
    onOverview();
  });
  $('#btn-labels').addEventListener('click', (e) => {
    const off = document.body.classList.toggle('hide-labels');
    e.currentTarget.textContent = off ? '🏷️ Show labels' : '🏷️ Hide labels';
  });
  $('#btn-bim').addEventListener('click', () => select('trainer'));
  $('#btn-list').addEventListener('click', () => document.body.classList.toggle('list-open'));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  return {
    select,
    ready: () => {
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 900);
    },
  };
}
