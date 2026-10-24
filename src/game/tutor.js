import Anthropic from '@anthropic-ai/sdk';
import { LESSONS } from './lessons.js';

/**
 * The language engine behind a scene: turns what the learner wants to say in
 * English into natural Japanese, and writes the NPC's reply.
 *
 * Three backends, best first:
 *  - "claude": the Claude account of the person viewing the page on claude.ai
 *    (the artifact `sample` capability; no key needed)
 *  - "api": the learner's own Anthropic API key, stored only in this browser
 *  - "offline": a phrasebook built from the lesson scripts, matched by meaning
 *
 * Every backend returns the same shape:
 *   { jp, romaji, en, tip, reply: { jp, romaji, en }, end }
 */

const KEY_STORE = 'machi-anthropic-key';
const MODEL = 'claude-opus-5-5';

const SCHEMA = {
  type: 'object',
  properties: {
    jp: { type: 'string' },
    romaji: { type: 'string' },
    en: { type: 'string' },
    tip: { type: 'string' },
    reply: {
      type: 'object',
      properties: { jp: { type: 'string' }, romaji: { type: 'string' }, en: { type: 'string' } },
      required: ['jp', 'romaji', 'en'],
      additionalProperties: false,
    },
    end: { type: 'boolean' },
  },
  required: ['jp', 'romaji', 'en', 'tip', 'reply', 'end'],
  additionalProperties: false,
};

function buildPrompt({ loc, lesson, history, english }) {
  const lines = history.map((h) => `${h.who === 'npc' ? lesson.role.en : 'Learner'}: ${h.jp}`).join('\n');
  return `You are the language engine of a Japanese-learning role-play game. Everything you write is shown to a beginner learner and spoken aloud by a Japanese text-to-speech voice.

Scene: ${loc.en} (${loc.jp}) in Japan. The learner, an English speaker, is talking to a ${lesson.role.en} (${lesson.role.jp}).
Conversation so far:
${lines || '(nothing yet)'}

The learner now wants to say, in English: "${english.replace(/"/g, "'")}"

Reply with JSON only, with these fields:
- "jp": how the learner should say this in natural, polite Japanese (です/ます form) that fits this situation. One short sentence, the way a Japanese person would really say it here. Use common kanji and kana, no furigana.
- "romaji": Hepburn romaji for "jp", with macrons for long vowels (ō, ū).
- "en": a short, natural English back-translation of "jp".
- "tip": one short English sentence about a useful word or grammar point in "jp", or "" if nothing stands out.
- "reply": what the ${lesson.role.en} naturally says back, in character, at most two short sentences, using polite staff language where it fits: {"jp", "romaji", "en"}.
- "end": true only if the scene has reached a natural end (for example paying and saying goodbye), otherwise false.
If the learner's English doesn't fit the scene, still translate it faithfully and let the ${lesson.role.en} react naturally.`;
}

function validate(r) {
  const ok = (o) => o && typeof o.jp === 'string' && o.jp && typeof o.romaji === 'string' && typeof o.en === 'string';
  if (!ok(r) || !ok(r.reply)) throw new Error('bad_shape');
  return { jp: r.jp, romaji: r.romaji, en: r.en, tip: r.tip || '', reply: r.reply, end: !!r.end };
}

// --- Offline phrasebook ----------------------------------------------------------

const STOP = new Set('i a an the to please can could would you me my is it do does for of and in on at be some like want wanna id i\'d i\'m im we us this that'.split(' '));
const words = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));

const CLOSING = { jp: 'ありがとうございました！', romaji: 'Arigatō gozaimashita!', en: 'Thank you very much!' };

/** Phrase entries for a location: what the learner might say and how the NPC answers. */
export function phrasebook(locId, loc) {
  const lesson = LESSONS[locId];
  const entries = [];
  lesson.turns.forEach((turn, i) => {
    const right = turn.options.find((o) => o.ok);
    const next = lesson.turns[i + 1]?.npc || CLOSING;
    entries.push({ say: right, also: turn.goal, reply: next, end: !lesson.turns[i + 1] });
  });
  for (const p of loc.phrases || []) {
    // skip lines only staff say, like いらっしゃいませ (their English carries a note in brackets)
    if (p.en.includes('(')) continue;
    if (!entries.some((e) => e.say.jp === p.jp)) entries.push({ say: p, also: '', reply: { jp: 'はい、かしこまりました。', romaji: 'Hai, kashikomarimashita.', en: 'Certainly.' }, end: false });
  }
  entries.push({ say: { jp: 'ありがとうございます。', romaji: 'Arigatō gozaimasu.', en: 'Thank you.' }, also: 'thanks', reply: { jp: 'どういたしまして。', romaji: 'Dō itashimashite.', en: "You're welcome." }, end: false });
  entries.push({ say: { jp: 'もう一度お願いします。', romaji: 'Mō ichido onegai shimasu.', en: 'One more time, please.' }, also: 'repeat again pardon sorry what', reply: null, end: false });
  entries.push({ say: { jp: 'さようなら。', romaji: 'Sayōnara.', en: 'Goodbye.' }, also: 'bye goodbye see you leave', reply: { jp: 'ありがとうございました。またどうぞ！', romaji: 'Arigatō gozaimashita. Mata dōzo!', en: 'Thank you. Please come again!' }, end: true });
  return entries;
}

function offlineMatch(entries, english) {
  const q = new Set(words(english));
  if (!q.size) return null;
  let best = null;
  for (const e of entries) {
    const w = new Set([...words(e.say.en), ...words(e.also || '')]);
    let hit = 0;
    for (const x of q) if (w.has(x) || [...w].some((y) => y.length > 3 && (y.startsWith(x) || x.startsWith(y)))) hit++;
    const score = hit / Math.max(q.size, 1);
    if (!best || score > best.score) best = { e, score };
  }
  return best && best.score >= 0.3 ? best.e : null;
}

// --- Public ---------------------------------------------------------------------

export function createTutor() {
  let sample = null;
  let samplePromise = null;
  let apiKey = '';
  try {
    apiKey = localStorage.getItem(KEY_STORE) || '';
  } catch {
    /* storage unavailable */
  }
  if (window.claude?.use) {
    samplePromise = window.claude
      .use('sample')
      .then((s) => (sample = s))
      .catch(() => null);
  }

  const tutor = {
    /** Which engine will answer: "claude", "api" or "offline". */
    async mode() {
      if (samplePromise) await samplePromise;
      if (sample) return 'claude';
      if (apiKey) return 'api';
      return 'offline';
    },
    hasKey: () => !!apiKey,
    setKey(key) {
      apiKey = key.trim();
      try {
        if (apiKey) localStorage.setItem(KEY_STORE, apiKey);
        else localStorage.removeItem(KEY_STORE);
      } catch {
        /* ignore */
      }
    },
    suggestions(locId, loc) {
      return phrasebook(locId, loc)
        .slice(0, 4)
        .map((e) => e.say.en);
    },

    /**
     * Translate the learner's English and write the NPC's reply.
     * Resolves with the shared shape, or { miss: true, suggestions } when the
     * offline phrasebook has nothing close.
     */
    async respond({ locId, loc, history, english }) {
      const lesson = LESSONS[locId];
      const mode = await tutor.mode();
      if (mode === 'claude') {
        try {
          const r = await sample.json(buildPrompt({ loc, lesson, history, english }), { modelTier: 'quick', cache: false });
          return { ...validate(r), source: 'claude' };
        } catch (e) {
          if (e?.code === 'not_granted') sample = null; // declined: use the next engine from now on
          if (!apiKey) return { ...offline(), source: 'offline', fellBack: true };
        }
      }
      if (apiKey) {
        try {
          const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true }); // the learner's own key, in their own browser
          const res = await client.beta.messages.create({
            model: MODEL,
            max_tokens: 2000,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
            messages: [{ role: 'user', content: buildPrompt({ loc, lesson, history, english }) }],
          });
          if (res.stop_reason === 'refusal') throw new Error('refusal');
          const text = res.content.find((b) => b.type === 'text')?.text;
          return { ...validate(JSON.parse(text)), source: 'api' };
        } catch (e) {
          const auth = e instanceof Anthropic.AuthenticationError;
          return { ...offline(), source: 'offline', fellBack: true, error: auth ? 'Your API key was not accepted.' : 'Could not reach Claude.' };
        }
      }
      return { ...offline(), source: 'offline' };

      function offline() {
        const hit = offlineMatch(phrasebook(locId, loc), english);
        if (!hit) return { miss: true, suggestions: tutor.suggestions(locId, loc) };
        const reply = hit.reply || history.filter((h) => h.who === 'npc').at(-1) || CLOSING;
        return { jp: hit.say.jp, romaji: hit.say.romaji, en: hit.say.en, tip: '', reply, end: hit.end };
      }
    },
  };
  return tutor;
}
