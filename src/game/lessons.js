// Role-play missions. At each place Bim plays the other person in the scene
// and you answer him. Every turn has one right answer and two tempting wrong
// ones; `tip` explains why a wrong answer doesn't fit.
//
// `spot` is where Bim stands for the scene ([x, z]); the camera looks at him
// from the `facing` side of the location.

const o = (jp, romaji, en, tip = null) => ({ jp, romaji, en, ok: !tip, tip });

export const LESSONS = {
  sushi: {
    role: { jp: '板前さん', en: 'sushi chef' },
    spot: [-28, 1.4],
    turns: [
      {
        npc: o('いらっしゃいませ！何名様ですか？', 'Irasshaimase! Nanmei-sama desu ka?', 'Welcome! How many people?'),
        goal: "Tell him you're on your own.",
        options: [o('一人です。', 'Hitori desu.', "It's just me."), o('一つです。', 'Hitotsu desu.', "It's one (thing).", 'Hitotsu counts things. For people use hitori.'), o('一時です。', 'Ichiji desu.', "It's one o'clock.", 'Ichiji is a time of day.')],
      },
      {
        npc: o('ご注文はお決まりですか？', 'Go-chūmon wa o-kimari desu ka?', 'Have you decided what to order?'),
        goal: "Ask for the chef's choice.",
        options: [o('おまかせでお願いします。', 'Omakase de onegai shimasu.', "Chef's choice, please."), o('お会計お願いします。', 'Okaikei onegai shimasu.', 'The bill, please.', "That asks for the bill. You haven't eaten yet!"), o('いただきます。', 'Itadakimasu.', '(Said before eating.)', 'You say this when the food is in front of you.')],
      },
      {
        npc: o('ありがとうございました！', 'Arigatō gozaimashita!', 'Thank you very much!'),
        goal: "You've finished. Ask for the bill.",
        options: [o('お会計お願いします。', 'Okaikei onegai shimasu.', 'The bill, please.'), o('おまかせでお願いします。', 'Omakase de onegai shimasu.', "Chef's choice, please.", "That orders more food."), o('いらっしゃいませ。', 'Irasshaimase.', 'Welcome!', 'Only shop staff say this.')],
      },
    ],
  },
  ramen: {
    role: { jp: '店員さん', en: 'ramen shop clerk' },
    spot: [-14, 1.4],
    turns: [
      {
        npc: o('いらっしゃい！食券を買ってくださいね。', 'Irasshai! Shokken o katte kudasai ne.', 'Welcome! Please buy a meal ticket.'),
        goal: 'Ask where the ticket machine is.',
        options: [o('券売機はどこですか？', 'Kenbaiki wa doko desu ka?', 'Where is the ticket machine?'), o('ラーメンが好きです。', 'Rāmen ga suki desu.', 'I like ramen.', "True, but it doesn't find the machine."), o('食券はいりません。', 'Shokken wa irimasen.', "I don't need a ticket.", 'In ticket shops you do need one.')],
      },
      {
        npc: o('麺のかたさはどうしますか？', 'Men no katasa wa dō shimasu ka?', 'How firm would you like the noodles?'),
        goal: 'Ask for firm noodles.',
        options: [o('かためでお願いします。', 'Katame de onegai shimasu.', 'Firm, please.'), o('熱いです。', 'Atsui desu.', "It's hot.", "That describes temperature, it doesn't order anything."), o('やわらかいですね。', 'Yawarakai desu ne.', "It's soft, isn't it.", 'Yawarakai means soft, the opposite.')],
      },
      {
        npc: o('お待たせしました！', 'Omatase shimashita!', 'Sorry to keep you waiting!'),
        goal: 'Say the phrase before you start eating.',
        options: [o('いただきます！', 'Itadakimasu!', '(Before eating.)'), o('ごちそうさまでした。', 'Gochisōsama deshita.', '(After eating.)', 'Save this one for when you finish.'), o('おやすみなさい。', 'Oyasumi nasai.', 'Good night.', 'That is for bedtime.')],
      },
    ],
  },
  chaya: {
    role: { jp: '茶屋のご主人', en: 'tea house owner' },
    spot: [-44, 1.8],
    turns: [
      {
        npc: o('いらっしゃいませ。こちらへどうぞ。', 'Irasshaimase. Kochira e dōzo.', 'Welcome. This way, please.'),
        goal: 'Ask if you may sit here.',
        options: [o('ここに座ってもいいですか？', 'Koko ni suwatte mo ii desu ka?', 'May I sit here?'), o('ここはどこですか？', 'Koko wa doko desu ka?', 'Where is this?', 'That asks where you are.'), o('座ってください。', 'Suwatte kudasai.', 'Please sit down.', "That tells him to sit!")],
      },
      {
        npc: o('何になさいますか？', 'Nani ni nasaimasu ka?', 'What would you like?'),
        goal: 'Order matcha and dumplings.',
        options: [o('抹茶とお団子をください。', 'Maccha to odango o kudasai.', 'Matcha and dumplings, please.'), o('抹茶はありません。', 'Maccha wa arimasen.', "There's no matcha.", "That says they don't have it."), o('お茶が好きじゃないです。', 'Ocha ga suki ja nai desu.', "I don't like tea.", 'Not ideal in a tea house!')],
      },
      {
        npc: o('いかがですか？', 'Ikaga desu ka?', 'How is it?'),
        goal: "Say it's very delicious.",
        options: [o('とてもおいしいです。', 'Totemo oishii desu.', "It's very delicious."), o('とても高いです。', 'Totemo takai desu.', "It's very expensive.", 'Takai means expensive (or tall).'), o('まずいです。', 'Mazui desu.', 'It tastes bad.', 'That would be quite rude.')],
      },
    ],
  },
  jinja: {
    role: { jp: '巫女さん', en: 'shrine maiden' },
    spot: [-33, -21],
    turns: [
      {
        npc: o('ようこそお参りくださいました。', 'Yōkoso o-mairi kudasaimashita.', 'Welcome to the shrine.'),
        goal: 'Ask her to show you how to pray.',
        options: [o('お参りの仕方を教えてください。', 'O-mairi no shikata o oshiete kudasai.', 'Please teach me how to pray.'), o('トイレはどこですか？', 'Toire wa doko desu ka?', 'Where is the toilet?', 'Useful, but not now.'), o('写真を撮ってください。', 'Shashin o totte kudasai.', 'Please take a photo.', "That's a different request.")],
      },
      {
        npc: o('二礼、二拍手、一礼です。', 'Nirei, nihakushu, ichirei desu.', 'Bow twice, clap twice, bow once.'),
        goal: 'Repeat the steps back to check.',
        options: [o('二礼二拍手一礼ですね。', 'Nirei nihakushu ichirei desu ne.', 'Two bows, two claps, one bow, right?'), o('一礼一拍手ですね。', 'Ichirei ippakushu desu ne.', 'One bow, one clap, right?', 'Count again: two, two, one.'), o('三礼三拍手ですね。', 'Sanrei sanbakushu desu ne.', 'Three bows, three claps?', 'Too many!')],
      },
      {
        npc: o('おみくじはいかがですか？', 'Omikuji wa ikaga desu ka?', 'Would you like a fortune slip?'),
        goal: "Say you'd like to draw one.",
        options: [o('はい、おみくじを引きたいです。', 'Hai, omikuji o hikitai desu.', "Yes, I'd like to draw one."), o('お守りを捨てたいです。', 'Omamori o sutetai desu.', 'I want to throw away a charm.', 'Please never throw charms away!'), o('大吉をください。', 'Daikichi o kudasai.', 'Give me great luck, please.', "Nice try, but luck can't be ordered.")],
      },
    ],
  },
  pagoda: {
    role: { jp: 'ガイドさん', en: 'tour guide' },
    spot: [-16, -22],
    turns: [
      {
        npc: o('こちらは五重塔です。', 'Kochira wa gojū-no-tō desu.', 'This is the five-storey pagoda.'),
        goal: 'Ask if you may take a photo.',
        options: [o('写真を撮ってもいいですか？', 'Shashin o totte mo ii desu ka?', 'May I take a photo?'), o('写真を撮らないでください。', 'Shashin o toranaide kudasai.', 'Please don’t take photos.', 'That forbids photos.'), o('写真はいくらですか？', 'Shashin wa ikura desu ka?', 'How much is a photo?', 'That asks for a price.')],
      },
      {
        npc: o('はい、どうぞ！', 'Hai, dōzo!', 'Sure, go ahead!'),
        goal: 'Politely ask him to take a photo of you.',
        options: [o('写真を撮っていただけますか？', 'Shashin o totte itadakemasu ka?', 'Could you take my photo?'), o('写真を見せてください。', 'Shashin o misete kudasai.', 'Please show me the photo.', 'Miseru means to show.'), o('カメラを買いたいです。', 'Kamera o kaitai desu.', 'I want to buy a camera.', 'That is shopping, not a photo.')],
      },
      {
        npc: o('撮りますよ。はい、チーズ！', 'Torimasu yo. Hai, chīzu!', "Here we go. Say cheese!"),
        goal: 'Thank him.',
        options: [o('ありがとうございます！', 'Arigatō gozaimasu!', 'Thank you very much!'), o('いただきます。', 'Itadakimasu.', '(Before eating.)', 'That is for meals.'), o('おやすみなさい。', 'Oyasumi nasai.', 'Good night.', 'That is for bedtime.')],
      },
    ],
  },
  ryokan: {
    role: { jp: '女将さん', en: 'inn landlady' },
    spot: [-34, 13.5],
    turns: [
      {
        npc: o('いらっしゃいませ。ご予約のお名前は？', 'Irasshaimase. Go-yoyaku no o-namae wa?', 'Welcome. The name on the reservation?'),
        goal: 'Say you booked under the name Smith.',
        options: [o('スミスで予約しています。', 'Sumisu de yoyaku shite imasu.', "I've booked under Smith."), o('予約はありません。', 'Yoyaku wa arimasen.', "I don't have a booking.", 'But you do!'), o('スミスさんですか？', 'Sumisu-san desu ka?', 'Are you Mr Smith?', 'That asks if she is Smith.')],
      },
      {
        npc: o('お部屋は二階でございます。', 'O-heya wa nikai de gozaimasu.', 'Your room is on the second floor.'),
        goal: 'Ask what time dinner is.',
        options: [o('夕食は何時ですか？', 'Yūshoku wa nanji desu ka?', 'What time is dinner?'), o('朝食はいりません。', 'Chōshoku wa irimasen.', "I don't need breakfast.", 'Chōshoku is breakfast.'), o('夕食はおいしかったです。', 'Yūshoku wa oishikatta desu.', 'Dinner was delicious.', "Past tense: you haven't eaten yet.")],
      },
      {
        npc: o('七時でございます。', 'Shichiji de gozaimasu.', "It's at seven."),
        goal: 'Ask where the bath is.',
        options: [o('お風呂はどこですか？', 'Ofuro wa doko desu ka?', 'Where is the bath?'), o('お風呂はきれいですね。', 'Ofuro wa kirei desu ne.', 'The bath is lovely.', "That's a compliment, not a question."), o('お風呂に入りません。', 'Ofuro ni hairimasen.', "I won't take a bath.", "That says you won't go.")],
      },
    ],
  },
  shiro: {
    role: { jp: '受付の人', en: 'ticket clerk' },
    spot: [-35, 47.5],
    turns: [
      {
        npc: o('いらっしゃいませ。何枚ですか？', 'Irasshaimase. Nanmai desu ka?', 'Welcome. How many tickets?'),
        goal: 'Ask for two adult tickets.',
        options: [o('大人二枚お願いします。', 'Otona nimai onegai shimasu.', 'Two adults, please.'), o('子ども三枚お願いします。', 'Kodomo sanmai onegai shimasu.', 'Three children, please.', 'Wrong number and age.'), o('二階お願いします。', 'Nikai onegai shimasu.', 'Second floor, please.', 'Nikai is a floor, not a ticket count.')],
      },
      {
        npc: o('二千円です。', 'Nisen-en desu.', "That's 2,000 yen."),
        goal: 'Ask whether you take your shoes off here.',
        options: [o('ここで靴を脱ぎますか？', 'Koko de kutsu o nugimasu ka?', 'Do I take my shoes off here?'), o('ここで靴を履きますか？', 'Koko de kutsu o hakimasu ka?', 'Do I put my shoes on here?', 'Haku means to put shoes on.'), o('靴を買いますか？', 'Kutsu o kaimasu ka?', 'Will you buy shoes?', "That's shoe shopping.")],
      },
      {
        npc: o('はい、こちらで脱いでください。', 'Hai, kochira de nuide kudasai.', 'Yes, please take them off here.'),
        goal: 'Ask where the castle keep is.',
        options: [o('天守閣はどこですか？', 'Tenshukaku wa doko desu ka?', 'Where is the castle keep?'), o('天守閣はいつですか？', 'Tenshukaku wa itsu desu ka?', 'When is the keep?', 'Itsu means when.'), o('お城を作りたいです。', 'O-shiro o tsukuritai desu.', 'I want to build a castle.', 'Ambitious, but no.')],
      },
    ],
  },
  fuji: {
    role: { jp: '山のガイドさん', en: 'mountain guide' },
    spot: [-62, -60],
    turns: [
      {
        npc: o('今日は富士山がよく見えますね！', 'Kyō wa Fuji-san ga yoku miemasu ne!', 'We can see Mount Fuji clearly today!'),
        goal: "Agree. It's beautiful!",
        options: [o('そうですね。きれいですね！', 'Sō desu ne. Kirei desu ne!', "It really is. It's beautiful!"), o('いいえ、見えません。', 'Iie, miemasen.', "No, I can't see it.", "It's right there!"), o('富士山はどこですか？', 'Fuji-san wa doko desu ka?', 'Where is Mount Fuji?', 'Look up!')],
      },
      {
        npc: o('登りますか？', 'Noborimasu ka?', 'Are you going to climb it?'),
        goal: 'Ask where the trailhead is.',
        options: [o('登山口はどこですか？', 'Tozanguchi wa doko desu ka?', 'Where is the trailhead?'), o('出口はどこですか？', 'Deguchi wa doko desu ka?', 'Where is the exit?', 'Deguchi is an exit.'), o('駅はどこですか？', 'Eki wa doko desu ka?', 'Where is the station?', 'That finds the station instead.')],
      },
      {
        npc: o('あちらです。', 'Achira desu.', "It's over there."),
        goal: 'Ask how many hours it takes to the summit.',
        options: [o('頂上まで何時間かかりますか？', 'Chōjō made nanjikan kakarimasu ka?', 'How many hours to the summit?'), o('頂上まで何円かかりますか？', 'Chōjō made nan-en kakarimasu ka?', 'How many yen to the summit?', 'That asks about money.'), o('頂上は何階ですか？', 'Chōjō wa nankai desu ka?', 'What floor is the summit?', "Mountains don't have floors.")],
      },
    ],
  },
  konbini: {
    role: { jp: '店員さん', en: 'konbini clerk' },
    spot: [10, 5],
    turns: [
      {
        npc: o('いらっしゃいませ。お弁当、温めますか？', 'Irasshaimase. O-bentō, atatamemasu ka?', 'Welcome. Shall I heat your bento?'),
        goal: 'Say yes, please.',
        options: [o('はい、お願いします。', 'Hai, onegai shimasu.', 'Yes, please.'), o('はい、温かいです。', 'Hai, atatakai desu.', "Yes, it's warm.", "That says it's already warm."), o('いいえ、お弁当です。', 'Iie, o-bentō desu.', "No, it's a bento.", "That doesn't answer the question.")],
      },
      {
        npc: o('袋はご利用ですか？', 'Fukuro wa go-riyō desu ka?', 'Do you need a bag?'),
        goal: "Politely say you don't need one.",
        options: [o('大丈夫です。', 'Daijōbu desu.', "I'm fine, thanks."), o('はい、お願いします。', 'Hai, onegai shimasu.', 'Yes, please.', 'That accepts the bag.'), o('袋はおいしいです。', 'Fukuro wa oishii desu.', 'The bag is delicious.', '…no.')],
      },
      {
        npc: o('八百円です。', 'Happyaku-en desu.', "That's 800 yen."),
        goal: 'Ask if you can pay by card.',
        options: [o('カードで払えますか？', 'Kādo de haraemasu ka?', 'Can I pay by card?'), o('カードを作りたいです。', 'Kādo o tsukuritai desu.', 'I want to make a card.', 'That asks to open a card.'), o('お金がありません。', 'O-kane ga arimasen.', "I don't have money.", 'Not a great thing to say at the till!')],
      },
    ],
  },
  koban: {
    role: { jp: 'おまわりさん', en: 'police officer' },
    spot: [16, -5],
    turns: [
      {
        npc: o('どうしましたか？', 'Dō shimashita ka?', 'What happened? / Can I help?'),
        goal: "Say you're lost.",
        options: [o('すみません、道に迷いました。', 'Sumimasen, michi ni mayoimashita.', "Excuse me, I'm lost."), o('すみません、財布を見つけました。', 'Sumimasen, saifu o mitsukemashita.', 'Excuse me, I found a wallet.', 'Good deed, but not your problem today.'), o('おなかがすきました。', 'Onaka ga sukimashita.', "I'm hungry.", "That's for the ramen shop.")],
      },
      {
        npc: o('どこへ行きたいですか？', 'Doko e ikitai desu ka?', 'Where do you want to go?'),
        goal: 'Say you want to go to the station.',
        options: [o('駅に行きたいです。', 'Eki ni ikitai desu.', 'I want to go to the station.'), o('駅から来ました。', 'Eki kara kimashita.', 'I came from the station.', 'Kara means from.'), o('駅が好きです。', 'Eki ga suki desu.', 'I like stations.', 'Nice, but not helpful.')],
      },
      {
        npc: o('まっすぐ行って、二つ目の信号を右に曲がってください。', 'Massugu itte, futatsume no shingō o migi ni magatte kudasai.', 'Go straight and turn right at the second traffic light.'),
        goal: 'Ask how many minutes it is on foot.',
        options: [o('歩いて何分ですか？', 'Aruite nanpun desu ka?', 'How many minutes on foot?'), o('歩いて何円ですか？', 'Aruite nan-en desu ka?', 'How many yen on foot?', "Walking is free!"), o('車で来ました。', 'Kuruma de kimashita.', 'I came by car.', "That doesn't ask anything.")],
      },
    ],
  },
  eki: {
    role: { jp: '駅員さん', en: 'station attendant' },
    spot: [33, -19],
    turns: [
      {
        npc: o('どうしましたか？', 'Dō shimashita ka?', 'Can I help you?'),
        goal: 'Ask how much it is to Tokyo Station.',
        options: [o('東京駅までいくらですか？', 'Tōkyō-eki made ikura desu ka?', 'How much is it to Tokyo Station?'), o('東京駅から来ました。', 'Tōkyō-eki kara kimashita.', 'I came from Tokyo Station.', 'Kara means from.'), o('東京駅まで何時ですか？', 'Tōkyō-eki made nanji desu ka?', 'What time until Tokyo Station?', 'Ikura asks the price.')],
      },
      {
        npc: o('二百円です。', 'Nihyaku-en desu.', "It's 200 yen."),
        goal: 'Ask which platform.',
        options: [o('何番線ですか？', 'Nanbansen desu ka?', 'Which platform?'), o('何時ですか？', 'Nanji desu ka?', 'What time is it?', 'That asks the time.'), o('何人ですか？', 'Nannin desu ka?', 'How many people?', 'That counts people.')],
      },
      {
        npc: o('三番線です。', 'Sanbansen desu.', "It's platform three."),
        goal: 'Check that the train goes to Shibuya.',
        options: [o('この電車は渋谷に行きますか？', 'Kono densha wa Shibuya ni ikimasu ka?', 'Does this train go to Shibuya?'), o('この電車は渋谷から来ましたか？', 'Kono densha wa Shibuya kara kimashita ka?', 'Did this train come from Shibuya?', 'That asks where it came from.'), o('この電車は高いですか？', 'Kono densha wa takai desu ka?', 'Is this train expensive?', "You've already got a ticket.")],
      },
    ],
  },
  hotel: {
    role: { jp: 'フロントの人', en: 'hotel receptionist' },
    spot: [52, 13.5],
    turns: [
      {
        npc: o('いらっしゃいませ。', 'Irasshaimase.', 'Welcome.'),
        goal: "Say you'd like to check in.",
        options: [o('チェックインをお願いします。', 'Chekkuin o onegai shimasu.', "I'd like to check in."), o('チェックアウトをお願いします。', 'Chekkuauto o onegai shimasu.', "I'd like to check out.", 'You just arrived!'), o('タクシーをお願いします。', 'Takushī o onegai shimasu.', 'A taxi, please.', 'That calls a taxi.')],
      },
      {
        npc: o('パスポートをお願いします。', 'Pasupōto o onegai shimasu.', 'Your passport, please.'),
        goal: 'Hand it over: "Here you are."',
        options: [o('はい、どうぞ。', 'Hai, dōzo.', 'Here you are.'), o('いいえ、結構です。', 'Iie, kekkō desu.', 'No, thank you.', 'That refuses.'), o('いただきます。', 'Itadakimasu.', '(Before eating.)', 'That is for meals.')],
      },
      {
        npc: o('お部屋は十二階です。', 'O-heya wa jūnikai desu.', 'Your room is on the 12th floor.'),
        goal: 'Ask from what time breakfast is served.',
        options: [o('朝ごはんは何時からですか？', 'Asagohan wa nanji kara desu ka?', 'From what time is breakfast?'), o('晩ごはんは何ですか？', 'Bangohan wa nan desu ka?', "What's for dinner?", 'Bangohan is dinner.'), o('朝ごはんはいくらでしたか？', 'Asagohan wa ikura deshita ka?', 'How much was breakfast?', "Past tense, and it's about price.")],
      },
    ],
  },
  fukuya: {
    role: { jp: '店員さん', en: 'shop assistant' },
    spot: [150, 4.6],
    turns: [
      {
        npc: o('いらっしゃいませ！何かお探しですか？', 'Irasshaimase! Nanika o-sagashi desu ka?', 'Welcome! Looking for something?'),
        goal: 'Ask if they have this in medium.',
        options: [o('これのMサイズはありますか？', 'Kore no emu saizu wa arimasu ka?', 'Do you have this in medium?'), o('これはいくらでしたか？', 'Kore wa ikura deshita ka?', 'How much was this?', 'That asks the price, in the past tense.'), o('Mサイズはいりません。', 'Emu saizu wa irimasen.', "I don't need a medium.", 'The opposite of what you want.')],
      },
      {
        npc: o('はい、ございます。', 'Hai, gozaimasu.', 'Yes, we have it.'),
        goal: 'Ask if you may try it on.',
        options: [o('試着してもいいですか？', 'Shichaku shite mo ii desu ka?', 'May I try it on?'), o('試食してもいいですか？', 'Shishoku shite mo ii desu ka?', 'May I taste it?', 'Shishoku is tasting food samples. Close!'), o('着替えてください。', 'Kigaete kudasai.', 'Please change your clothes.', 'That tells her to change.')],
      },
      {
        npc: o('いかがでしたか？', 'Ikaga deshita ka?', 'How was it?'),
        goal: "Say you'll take it.",
        options: [o('これにします。', 'Kore ni shimasu.', "I'll take this one."), o('これは何ですか？', 'Kore wa nan desu ka?', 'What is this?', "You already know what it is."), o('また来ました。', 'Mata kimashita.', 'I came again.', 'That talks about coming back.')],
      },
    ],
  },
  shinkansen: {
    role: { jp: 'みどりの窓口の人', en: 'ticket office clerk' },
    spot: [96, 135],
    turns: [
      {
        npc: o('どちらまでですか？', 'Dochira made desu ka?', 'Where to?'),
        goal: 'Ask for one reserved seat to Kyoto.',
        options: [o('京都まで指定席を一枚お願いします。', 'Kyōto made shiteiseki o ichimai onegai shimasu.', 'One reserved seat to Kyoto, please.'), o('京都から来ました。', 'Kyōto kara kimashita.', 'I came from Kyoto.', 'Kara means from.'), o('京都は寒いですか？', 'Kyōto wa samui desu ka?', 'Is Kyoto cold?', 'Small talk, not a ticket.')],
      },
      {
        npc: o('窓側と通路側、どちらがいいですか？', 'Madogawa to tsūrogawa, dochira ga ii desu ka?', 'Window or aisle?'),
        goal: 'Choose the window seat (for the view of Fuji!).',
        options: [o('窓側をお願いします。', 'Madogawa o onegai shimasu.', 'Window, please.'), o('通路側をお願いします。', 'Tsūrogawa o onegai shimasu.', 'Aisle, please.', "Tsūro is the aisle: no Fuji view."), o('窓を開けてください。', 'Mado o akete kudasai.', 'Please open the window.', "Shinkansen windows don't open.")],
      },
      {
        npc: o('七号車の十二番A席です。', 'Nanagōsha no jūniban ē-seki desu.', 'Car 7, seat 12A.'),
        goal: 'Buy one ekiben (station bento) for the ride.',
        options: [o('駅弁を一つください。', 'Ekiben o hitotsu kudasai.', 'One station bento, please.'), o('駅弁を一人ください。', 'Ekiben o hitori kudasai.', 'One person of bento, please.', 'Hitori counts people. Use hitotsu.'), o('駅員を一つください。', 'Ekiin o hitotsu kudasai.', 'One station attendant, please.', 'Ekiin is the staff!')],
      },
    ],
  },
  kuko: {
    role: { jp: 'グランドスタッフ', en: 'check-in agent' },
    spot: [218, 110],
    turns: [
      {
        npc: o('こんにちは。パスポートを見せてください。', 'Konnichiwa. Pasupōto o misete kudasai.', 'Hello. Please show me your passport.'),
        goal: 'Hand it over: "Here you are."',
        options: [o('はい、どうぞ。', 'Hai, dōzo.', 'Here you are.'), o('いいえ、見ません。', 'Iie, mimasen.', "No, I won't look.", 'Misete means show, not look.'), o('パスポートを作りました。', 'Pasupōto o tsukurimashita.', 'I made a passport.', 'Just hand it over.')],
      },
      {
        npc: o('お席のご希望はありますか？', 'O-seki no go-kibō wa arimasu ka?', 'Any seat preference?'),
        goal: 'Ask for a window seat.',
        options: [o('窓側の席をお願いします。', 'Madogawa no seki o onegai shimasu.', 'A window seat, please.'), o('窓を閉めてください。', 'Mado o shimete kudasai.', 'Please close the window.', "That's about the window itself."), o('席はいりません。', 'Seki wa irimasen.', "I don't need a seat.", 'A long flight standing up?')],
      },
      {
        npc: o('お預けのお荷物はございますか？', 'O-azuke no o-nimotsu wa gozaimasu ka?', 'Any bags to check in?'),
        goal: "Say you'd like to check this bag.",
        options: [o('この荷物を預けたいです。', 'Kono nimotsu o azuketai desu.', "I'd like to check this bag."), o('この荷物を買いたいです。', 'Kono nimotsu o kaitai desu.', 'I want to buy this bag.', 'Kau means to buy.'), o('荷物がなくなりました。', 'Nimotsu ga nakunarimashita.', 'My bag is lost.', "That's for after the flight, hopefully never.")],
      },
    ],
  },
  minato: {
    role: { jp: '切符売り場の人', en: 'ferry ticket clerk' },
    spot: [42, 169.2],
    facing: [0, 1],
    turns: [
      {
        npc: o('いらっしゃいませ。', 'Irasshaimase.', 'Welcome.'),
        goal: 'Ask for one ferry ticket.',
        options: [o('フェリーの切符を一枚ください。', 'Ferī no kippu o ichimai kudasai.', 'One ferry ticket, please.'), o('フェリーを一つください。', 'Ferī o hitotsu kudasai.', 'One ferry, please.', "You'd be buying the whole ship!"), o('切符をなくしました。', 'Kippu o nakushimashita.', 'I lost my ticket.', "You haven't bought one yet.")],
      },
      {
        npc: o('片道ですか、往復ですか？', 'Katamichi desu ka, ōfuku desu ka?', 'One way or return?'),
        goal: 'Ask for a return ticket.',
        options: [o('往復でお願いします。', 'Ōfuku de onegai shimasu.', 'Return, please.'), o('片道でお願いします。', 'Katamichi de onegai shimasu.', 'One way, please.', 'Katamichi is one way.'), o('毎日でお願いします。', 'Mainichi de onegai shimasu.', 'Every day, please.', 'Mainichi means every day.')],
      },
      {
        npc: o('次の船は十時です。', 'Tsugi no fune wa jūji desu.', "The next boat is at ten o'clock."),
        goal: 'Ask where you board.',
        options: [o('乗り場はどこですか？', 'Noriba wa doko desu ka?', 'Where do I board?'), o('売り場はどこですか？', 'Uriba wa doko desu ka?', 'Where is the ticket counter?', "You're standing at it."), o('船は好きですか？', 'Fune wa suki desu ka?', 'Do you like boats?', 'Friendly, but not useful.')],
      },
    ],
  },
  onsen: {
    role: { jp: '受付の人', en: 'onsen receptionist' },
    spot: [-248, 51],
    turns: [
      {
        npc: o('いらっしゃいませ。タオルはお持ちですか？', 'Irasshaimase. Taoru wa o-mochi desu ka?', 'Welcome. Do you have a towel?'),
        goal: 'Ask if you can borrow one.',
        options: [o('タオルを借りられますか？', 'Taoru o kariraremasu ka?', 'Can I borrow a towel?'), o('タオルを洗いました。', 'Taoru o araimashita.', 'I washed a towel.', "That's about laundry."), o('タオルが好きです。', 'Taoru ga suki desu.', 'I like towels.', 'Who doesn’t? But ask to borrow one.')],
      },
      {
        npc: o('はい、二百円です。', 'Hai, nihyaku-en desu.', "Sure, that's 200 yen."),
        goal: 'Ask which way the outdoor bath is.',
        options: [o('露天風呂はどちらですか？', 'Rotenburo wa dochira desu ka?', 'Which way is the outdoor bath?'), o('露天風呂を作りたいです。', 'Rotenburo o tsukuritai desu.', 'I want to build an outdoor bath.', 'Lovely dream, wrong question.'), o('お風呂を出ました。', 'Ofuro o demashita.', 'I got out of the bath.', "You haven't been in yet.")],
      },
      {
        npc: o('体を洗ってから入ってくださいね。', 'Karada o aratte kara haitte kudasai ne.', 'Please wash before you get in.'),
        goal: 'Say "Understood."',
        options: [o('はい、わかりました。', 'Hai, wakarimashita.', 'Yes, understood.'), o('いいえ、洗いません。', 'Iie, araimasen.', "No, I won't wash.", 'Washing first is the golden rule!'), o('わかりません、入ります。', 'Wakarimasen, hairimasu.', "I don't understand, I'm going in.", 'Please wash first.')],
      },
    ],
  },
  koen: {
    role: { jp: '友だち', en: 'friend' },
    spot: [66, -135],
    turns: [
      {
        npc: o('桜がきれいですね！お花見をしましょう！', 'Sakura ga kirei desu ne! Ohanami o shimashō!', 'The cherry blossoms are lovely! Let’s have a hanami picnic!'),
        goal: 'Agree: "Great, let\'s do it!"',
        options: [o('いいですね！しましょう！', 'Ii desu ne! Shimashō!', "Sounds great! Let's!"), o('桜は嫌いです。', 'Sakura wa kirai desu.', 'I hate cherry blossoms.', 'Harsh!'), o('花屋はどこですか？', 'Hanaya wa doko desu ka?', 'Where is the florist?', 'The flowers are right here.')],
      },
      {
        npc: o('ボートに乗りませんか？', 'Bōto ni norimasen ka?', 'Shall we go on a boat?'),
        goal: "Say you'd like to rent one.",
        options: [o('ボートを借りたいです。', 'Bōto o karitai desu.', "I'd like to rent a boat."), o('ボートを売りたいです。', 'Bōto o uritai desu.', 'I want to sell a boat.', 'Uru means to sell.'), o('ボートに乗りません。', 'Bōto ni norimasen.', "I won't ride a boat.", 'That turns the idea down.')],
      },
      {
        npc: o('ちょっと待っててね。', 'Chotto mattete ne.', 'Wait here a moment, okay?'),
        goal: 'Quickly ask where the toilet is.',
        options: [o('トイレはどこですか？', 'Toire wa doko desu ka?', 'Where is the toilet?'), o('トイレはきれいですか？', 'Toire wa kirei desu ka?', 'Is the toilet clean?', 'First find it!'), o('トイレに行きません。', 'Toire ni ikimasen.', "I won't go to the toilet.", 'But you need to!')],
      },
    ],
  },
};

/** Bim's line to open a scene, e.g. "We're at the sushi restaurant! I'll play the chef." */
export function introLine(loc, lesson) {
  return {
    jp: `${loc.jp}に着きました！ぼくが${lesson.role.jp}をやります。`,
    en: `We're at the ${loc.en.toLowerCase()}! I'll play the ${lesson.role.en}.`,
  };
}
