# Machi de Nihongo · 街で日本語

Learn Japanese for real-life situations by exploring a 3D diorama of a Japanese town.
It's part Edo-period old town and part modern Tokyo, split by a river, on a 600 × 430 m diorama with a giant Mount Fuji in the north-west, a bay along the south coast and an airport in the south-east.

## Play it

- **One file:** open [`machi-de-nihongo.html`](machi-de-nihongo.html) in Chrome or Edge, either from disk or hosted anywhere. Everything is inside, and only the fonts load from Google Fonts.
- **Dev server:** run `npm install`, then `npm run dev`, and open the printed URL.
- **Builds:** `npm run build` creates a static site in `dist/`. `npm run build:html` rebuilds the single-file game.

## The game

Press **▶ Play** on the start screen. It turns on fullscreen and music and opens the **stamp book (御朱印帳)**. Pick a place and two characters pop up there. **Bim** is your interpreter, and the **person who works there** (the sushi chef, police officer, onsen receptionist and so on) is dressed for the job and has their own voice.

Each exchange in a scene:

1. **You say what you want in English.** Press 🎤 *Speak English*, type it, or tap a suggestion.
2. **Bim says it in Japanese**, with romaji, an English gloss and sometimes a grammar tip.
3. **You repeat it in Japanese.** Press 🎤 *Say it* to get a pronunciation score, or *I said it out loud* when there is no microphone.
4. **The person answers in Japanese**, with English subtitles.

A scene lasts up to four exchanges, or until it ends naturally (you pay, say goodbye and so on). Each exchange is worth 10–20 XP depending on pronunciation, and finishing adds 20. The stamp gets 1–3 stars from your average pronunciation, and every 100 XP is a new level. Progress is saved in your browser.

### Conversation engine

Bim needs a language model to translate anything you say. [`src/game/tutor.js`](src/game/tutor.js) picks the best one available:

| Where you play | Engine |
| --- | --- |
| The published page on claude.ai | Claude, through your own Claude account (asks your permission the first time) |
| Locally or the single HTML file, with an API key entered on the start screen | Claude (`claude-opus-5-5`) through the Anthropic SDK. The key stays in your browser's local storage. |
| Anywhere, with neither | Offline phrasebook: about 100 phrases built from the scene scripts, matched to what you say |

Speech uses the browser: Japanese and English text-to-speech, and speech recognition (Chrome or Edge) for 🎤. Published pages on claude.ai can't use the microphone, so you type there. To speak, use the single HTML file.

Sound effects and a soft pentatonic koto melody are synthesised with Web Audio. Toggle music with 🎵 and fullscreen with ⛶. Scenes, roles and openings are in [`src/game/lessons.js`](src/game/lessons.js), and the townspeople are in [`src/trainer/npc.js`](src/trainer/npc.js).

## Controls

- **Drag** to rotate, **right-drag** to pan, **scroll** to zoom.
- Click a floating label or pick a place from the list. The camera flies to it and opens a card with key phrases. Press 🔊 to hear them (this uses the browser's Japanese voice).
- **🌙 Night** switches to night: lanterns, neon and windows light up.
- **🤖 Bim** flies you to your trainer. He bows, waves and greets you in Japanese. His card has moves (bow, wave, stroll, cheer) and phrases you can play.

## Bim (ビム先生), the trainer

Bim is a samurai version of a small companion robot. He is modelled on a porcelain-blue figure: a big rounded head with blue lens eyes and a forehead dot, and a kabuto with hooked kuwagata horns, a round boss and a swept-back plume.
His armour is a lamellar neck guard and side flaps, a white breastplate with a BIM name plate and shoulder cords, grid-plated shoulder guards and waist plates, white bracers, ribbed shin guards and chunky shoes.
He wears a braided rope obi with a knot and tassels, a light-blue katana across the front, and a paw-print banner on an L-shaped pole on his back.

He is built in [`src/trainer/bim.js`](src/trainer/bim.js) with jointed hips, knees, shoulders, elbows and neck, and has these animations:
idle breathing, blinking, looking at the camera, bow (お辞儀), wave, nod, cheer, walking along a path, and talking (the mouth glows while speech plays).
The API, used by `main.js`, is `play(name)`, `walkTo(points)`, `face(target)`, `lookAt(v)` and `setTalking(on)`. His profile and lines live in [`src/trainer/profile.js`](src/trainer/profile.js).

## The city

| District | Places (lesson spots) | Scenery |
| --- | --- | --- |
| 昔の町 Old town | 寿司屋 sushi, ラーメン屋 ramen, 茶屋 tea house, 神社 shrine, 五重塔 pagoda, 旅館 ryokan, 城 castle | the Edo-style core, a village, rice paddies, the castle with its moat |
| 今の町 Modern city | コンビニ konbini, 交番 police box, 駅 station, ホテル hotel, 服屋 clothing store | a 14-street grid with two skyscraper cores, a Skytree-style tower, a covered 商店街 shopping arcade, an elevated railway |
| 旅 Travel | 新幹線 Shinkansen terminal, 空港 airport, 港 harbour & ferry | a bullet train that crosses the map and stops at a Tokyo Station-style terminal; a runway, terminal, tower and a plane that takes off, circles the city and lands; quays, cranes, a container ship, red-brick warehouses, a Ferris wheel, a ferry crossing the bay and lighthouses |
| 遊び Leisure & nature | 温泉 onsen, 公園 park, 富士山 Mount Fuji | an onsen valley with inns, a bathhouse, steaming outdoor baths and red bridges; a central park with a lake, swan boats, a sakura avenue, a shrine and a museum; Fuji with forests, two lakes and a Chūreitō-style pagoda on a hill; tea fields, farms, orchards and a pine-lined beach |

Bridges cross the river, and sakura petals ride a shifting breeze around wherever the camera is looking.

All place data (position, entrance direction, situation, phrases) lives in
[`src/locations.js`](src/locations.js). Each building is placed from those coordinates.

## Colourway

The default look is **pastel blue**, like porcelain clay models. Every colour passes through `tint()` / `tintGlow()` in
[`src/core/palette.js`](src/core/palette.js), which maps it onto a soft blue ramp by brightness. Bim uses his own hand-picked pastel set: porcelain armour and a periwinkle body.
To get the original warm palette back, set `THEME = 'classic'` in that file.

## Code map

```
src/
  main.js            boot: build the world, labels, loop
  scene.js           renderer, camera, sky, lights, bloom, day/night, camera flights, static-mesh baking
  ui.js              place list, location card, speech synthesis
  locations.js       lesson spots + phrases
  trainer/           Bim: model + animation (bim.js), profile and lines (profile.js)
  core/              colour theme (palette.js), materials, geometry helpers, Japanese roof generator, canvas text signs
  world/
    layout.js        city plan (river, streets, blocks, railway)
    terrain.js       diorama base, river, streets, bridge, pond
    oldtown.js       Edo-style core: shops, shrine, pagoda, ryokan
    outskirts.js     Mount Fuji, forest, lake, village, rice paddies, castle, bridges
    expansion.js     Shinkansen, harbour, airport, shopping arcade, onsen valley, countryside, central park
    modern.js        modern blocks and landmarks
    props.js         trees, lanterns, torii, poles, vending machines…
    life.js          cars, train, koi, petals
```

Everything is built from Three.js primitives in code, so there are no model files to download.
Static meshes that share a material are merged at startup, and multi-material meshes are split by material first, which turns about 31,000 meshes into baked batches. Small parts and signs are grouped into 60-unit chunks that are only drawn near the camera, and cars are instanced. That keeps a frame at roughly 1,500 draw calls for the full overview and fewer at street level. Building facades share one material per wall colour, with the window grid scaled through UVs. The sun's shadow frustum follows the camera focus and tightens as you zoom in.

## Roadmap

1. ~~Trainer avatar~~ Bim is done. Next, Bim walks you to each place and plays the other side of each scene (the shop clerk, the police officer and so on).
2. Role-play lessons per place: listen, choose or speak your answer, get feedback.
3. Progress, XP and stamps (a 御朱印 book) for each place you master.
