# Machi de Nihongo · 街で日本語

Learn Japanese for real-life situations by exploring a 3D diorama of a Japanese town.
It's part Edo-period old town and part modern Tokyo, split by a turquoise river.

## Run it

```bash
npm install
npm run dev      # open the printed URL
npm run build    # static build in dist/ (relative paths, can be hosted anywhere)
```

## Controls

- **Drag** to rotate, **right-drag** to pan, **scroll** to zoom.
- Click a floating label or pick a place from the list. The camera flies to it and opens a card with key phrases. Press 🔊 to hear them (this uses the browser's Japanese voice).
- **🌙 Night** switches to night: lanterns, neon and windows light up.
- **🤖 Bim** flies you to your trainer. He bows, waves and greets you in Japanese. His card has moves (bow, wave, stroll, cheer) and phrases you can play.

## Bim (ビム先生), the trainer

Bim is a samurai version of a small companion robot. He has a big rounded head with a white face, amber eye rings and ear discs, plus white C-shaped hands and orange-soled feet.
His samurai gear is a kabuto with ribs and a gold crescent crest, a red neck guard and side flaps, lacquered shoulder guards and waist plates, an obi with a katana, and a 先生 back banner.

He is built in [`src/trainer/bim.js`](src/trainer/bim.js) with jointed hips, knees, shoulders, elbows and neck, and has these animations:
idle breathing, blinking, looking at the camera, bow (お辞儀), wave, nod, cheer, walking along a path, and talking (the mouth glows while speech plays).
The API, used by `main.js`, is `play(name)`, `walkTo(points)`, `face(target)`, `lookAt(v)` and `setTalking(on)`. His profile and lines live in [`src/trainer/profile.js`](src/trainer/profile.js).

## The city

| District | Places (lesson spots) | Scenery |
| --- | --- | --- |
| 昔の町 Old town (west) | 寿司屋 sushi restaurant, ラーメン屋 ramen shop, 茶屋 tea house, 神社 shrine, 五重塔 pagoda, 旅館 ryokan | torii tunnel, pond with a floating torii and koi, fire-watch tower, town gate, pavilion, bamboo, sakura with falling petals |
| 今の町 Modern city (east) | コンビニ konbini, 交番 police box (asking directions), 駅 station, ホテル hotel | office blocks with rooftop clutter and billboards, neon blade signs, traffic, an elevated railway with a train that stops at the station |

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
    oldtown.js       Edo-style buildings
    modern.js        modern blocks and landmarks
    props.js         trees, lanterns, torii, poles, vending machines…
    life.js          cars, train, koi, petals
```

Everything is built from Three.js primitives in code, so there are no model files to download.
Static meshes that share a material are merged at startup, which brings about 2,600 meshes down to roughly 170 draw calls.

## Roadmap

1. ~~Trainer avatar~~ Bim is done. Next, Bim walks you to each place and plays the other side of each scene (the shop clerk, the police officer and so on).
2. Role-play lessons per place: listen, choose or speak your answer, get feedback.
3. Progress, XP and stamps (a 御朱印 book) for each place you master.
