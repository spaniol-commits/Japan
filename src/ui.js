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

export function speak(text) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  if (jaVoice) u.voice = jaVoice;
  u.rate = 0.85;
  speechSynthesis.speak(u);
  return true;
}

export function createUI({ locations, onSelect, onOverview, onNight }) {
  const $ = (sel) => document.querySelector(sel);
  const list = $('#place-list');
  const card = $('#place-card');
  const loader = $('#loader');

  const groups = [
    ['old', '昔の町', 'Old town'],
    ['modern', '今の町', 'Modern city'],
  ];
  list.innerHTML = groups
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

  const select = (id) => {
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
      <ul class="phrases">
        ${loc.phrases
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
      </ul>
      <div class="trainer-soon">先生 <b>Your trainer</b> will meet you here for role-play lessons — coming next.</div>
    `;
    card.classList.add('open');
    card.querySelector('.close').onclick = () => close();
    card.querySelectorAll('.say').forEach((b) => {
      b.onclick = () => {
        if (!speak(loc.phrases[+b.dataset.i].jp)) b.title = 'Speech not supported in this browser';
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
