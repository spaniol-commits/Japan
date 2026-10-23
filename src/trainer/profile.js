// Who Bim is, what he says when you meet him, and the moves he can show off.

export const TRAINER = {
  jp: 'ビム先生',
  kana: 'びむせんせい',
  romaji: 'Bimu-sensei',
  en: 'Bim, your trainer',
  // Bim's spot at the old-town end of the drum bridge, facing the main street
  home: { x: -9.6, z: 1.0, yaw: -1.05 },
  intro:
    'A samurai robot who knows every corner of this town. Soon Bim will walk you to each place and play the shop clerk, the station attendant or the police officer, so you can practise for real.',
  phrases: [
    { jp: 'こんにちは！ぼくはビムです。', romaji: 'Konnichiwa! Boku wa Bimu desu.', en: "Hello! I'm Bim." },
    { jp: '一緒に日本語を勉強しましょう！', romaji: 'Issho ni Nihongo o benkyō shimashō!', en: "Let's study Japanese together!" },
    { jp: 'よろしくお願いします。', romaji: 'Yoroshiku onegai shimasu.', en: 'Nice to meet you. (I look forward to working with you.)' },
    { jp: 'がんばって！', romaji: 'Ganbatte!', en: 'You can do it!' },
  ],
  moves: [
    { id: 'bow', jp: 'お辞儀', en: 'Bow' },
    { id: 'wave', jp: '手を振る', en: 'Wave' },
    { id: 'walk', jp: '散歩', en: 'Stroll' },
    { id: 'cheer', jp: '応援', en: 'Cheer' },
  ],
  // Short stroll along the old main street and back
  stroll: [
    [-14, 1.2],
    [-20, 0.4],
    [-20, -0.8],
    [-13, -0.6],
    [-9.6, 1.0],
  ],
};
