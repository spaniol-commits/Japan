import * as THREE from 'three';
import { glow } from './materials.js';
import { tint } from './palette.js';

export const FONT_SANS = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
export const FONT_SERIF = '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif';

const texCache = new Map();
const matCache = new Map();

/**
 * Canvas texture with Japanese text. `vertical` stacks characters top-to-bottom
 * like the hanging signs in Japanese streets. Lines are separated with "\n".
 */
export function textTexture(text, { bg = '#ffffff', fg = '#000000', font = FONT_SANS, weight = 700, vertical = false, aspect = 3, border = null, raw = false } = {}) {
  // `raw` keeps brand-critical colours (like a red logo) out of the theme tint
  if (!raw) {
    bg = tint(bg);
    fg = tint(fg);
    if (border) border = tint(border);
  }
  const key = [text, bg, fg, font, weight, vertical, aspect, border].join('|');
  if (texCache.has(key)) return texCache.get(key);

  const H = 256;
  const W = Math.round(H * aspect);
  const canvas = document.createElement('canvas');
  canvas.width = vertical ? H : W;
  canvas.height = vertical ? W : H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  }
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = text.split('\n');
  if (vertical) {
    const chars = [...text.replace(/\n/g, '')];
    const step = Math.min((canvas.height - 40) / chars.length, canvas.width * 0.85);
    ctx.font = `${weight} ${Math.floor(step * 0.86)}px ${font}`;
    const top = (canvas.height - step * chars.length) / 2 + step / 2;
    chars.forEach((ch, i) => ctx.fillText(ch, canvas.width / 2, top + i * step));
  } else {
    const lineH = (canvas.height - 30) / lines.length;
    lines.forEach((line, i) => {
      let size = Math.floor(lineH * (i === 0 ? 0.78 : 0.55));
      ctx.font = `${weight} ${size}px ${font}`;
      const maxW = canvas.width - 40;
      const measured = ctx.measureText(line).width;
      if (measured > maxW) {
        size = Math.floor((size * maxW) / measured);
        ctx.font = `${weight} ${size}px ${font}`;
      }
      ctx.fillText(line, canvas.width / 2, 15 + lineH * (i + 0.5));
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

/**
 * A sign board (thin box) with text on its front face (+z).
 * `lit` signs use the texture as emissive map so they glow at night.
 */
export function sign(parent, text, w, h, opts = {}, x = 0, y = 0, z = 0, ry = 0) {
  const vertical = opts.vertical ?? h > w * 1.4;
  const tex = textTexture(text, { ...opts, vertical, aspect: vertical ? h / w : w / h });
  const faceKey = tex.uuid + '|' + (opts.lit ?? '') + '|' + (opts.litDay ?? '');
  let face = matCache.get(faceKey);
  if (!face) {
    face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    if (opts.lit) {
      face.emissive = new THREE.Color('#ffffff');
      face.emissiveMap = tex;
      glow(face, opts.lit === true ? 1.3 : opts.lit, opts.litDay ?? 0.12);
    }
    matCache.set(faceKey, face);
  }
  const edgeColor = opts.raw ? opts.frame ?? opts.bg ?? '#333' : tint(opts.frame ?? opts.bg ?? '#333');
  let edge = matCache.get(edgeColor);
  if (!edge) matCache.set(edgeColor, (edge = new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.8 })));
  const depth = opts.depth ?? 0.12;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), [edge, edge, edge, edge, face, opts.backFace ? face : edge]);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  m.userData.sign = true;
  parent.add(m);
  return m;
}

/** Every string drawn on a sign, so fonts can be preloaded before textures are painted. */
export const SIGN_TEXT =
  '楽寿司すしラーメン一番屋駅交番KOBANコンビニ24HホテルHOTEL茶屋お茶甘味処神社五重塔旅館居酒屋カラオケカフェ薬ドラッグ本屋銀行ATM歯科不動産ラーメンうどん酒焼鳥中央口STATIONCONVENIENCE営業中ゲームセンターパチンコ東京寿亭花月堂0123456789まつりようこそWELCOMEJAPAN日本そば米魚八百屋豆腐団子城天守閣富士山スカイツリー公園BIMたこ焼き花屋パン靴時計果物雑貨お菓子おもちゃメガネ古着商店街服ファッションFASHION東京駅新幹線SHINKANSENフェリー乗り場空港AIRPORT博物館ゆ♨温泉おみやげまんじゅう';

export async function loadFonts() {
  if (!document.fonts) return;
  const jobs = [];
  for (const family of ['Noto Sans JP', 'Noto Serif JP']) {
    for (const w of [700, 900]) jobs.push(document.fonts.load(`${w} 64px "${family}"`, SIGN_TEXT));
  }
  // Never block the city on a slow font CDN.
  await Promise.race([Promise.allSettled(jobs), new Promise((r) => setTimeout(r, 4000))]);
}
