require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const express = require('express');
const { Settings, Participant, Winner } = require('./models');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.use(express.json());

const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const CHANNEL_ID = process.env.CHANNEL_ID;

// ============ MongoDB ulanish ============
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB ulandi'))
  .catch(err => console.error('❌ MongoDB xato:', err));

// ============ Yordamchi funksiyalar ============
async function getSettings() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
}

async function getParticipantCount() {
  return await Participant.countDocuments();
}

async function isAdmin(ctx) {
  return ctx.from.id === ADMIN_ID;
}

async function updateChannelPost(ctx, settings) {
  const count = await getParticipantCount();
  const text = settings.currentText || '🏆 Turnir boshlanmoqda!';
  const caption = `${text}\n\n` +
    `👥 Qatnashchilar: ${count}/${settings.maxParticipants}\n` +
    `💰 Kirish to'lovi: ${settings.starsAmount} ⭐️\n` +
    `🏆 G'oliblar soni: ${settings.winnersCount} ta`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(`🎮 Qatnashish (${count}/${settings.maxParticipants})`, 'join_turnir')]
  ]);

  try {
    if (settings.channelMessageId && settings.currentPhoto) {
      await ctx.telegram.editMessageCaption(
        CHANNEL_ID,
        settings.channelMessageId,
        null,
        caption,
        { reply_markup: keyboard.reply_markup, parse_mode: 'HTML' }
      );
    } else if (settings.channelMessageId) {
      await ctx.telegram.editMessageText(
        CHANNEL_ID,
        settings.channelMessageId,
        null,
        caption,
        { reply_markup: keyboard.reply_markup, parse_mode: 'HTML' }
      );
    }
  } catch (e) {
    console.log('Post yangilashda xato:', e.message);
  }
}

// ============ Admin holati ============
const adminState = {};

// ============ START ============
bot.start(async (ctx) => {
  if (await isAdmin(ctx)) {
    await ctx.reply(
      '👑 Admin paneliga xush kelibsiz!\n\nQuyidagi buyruqlardan foydalaning:',
      Markup.keyboard([
        ['📢 Turnir e\'lon qilish', '⚙️ Sozlamalar'],
        ['👥 Qatnashchilar', '🏆 G\'oliblarni aniqlash'],
        ['📊 Statistika', '🔄 Turnirni tozalash']
      ]).resize()
    );
  } else {
    const settings = await getSettings();
    const count = await getParticipantCount();
    await ctx.reply(
      `🏆 Turnir botiga xush kelibsiz!\n\n` +
      `👥 Hozir ${count}/${settings.maxParticipants} kishi qatnashmoqda\n` +
      `💰 Kirish to'lovi: ${settings.starsAmount} ⭐️`
    );
  }
});

// ============ ADMIN PANEL ============

// 📢 Turnir e'lon qilish
bot.hears('📢 Turnir e\'lon qilish', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  adminState[ADMIN_ID] = { step: 'waiting_message' };
  await ctx.reply(
    '📝 Turnir matnini yuboring:\n\n(Rasm ham yuborishingiz mumkin, yoki faqat matn)',
    Markup.keyboard([['❌ Bekor qilish']]).resize()
  );
});

// ⚙️ Sozlamalar
bot.hears('⚙️ Sozlamalar', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  const settings = await getSettings();
  await ctx.reply(
    `⚙️ Hozirgi sozlamalar:\n\n` +
    `👥 Max qatnashchilar: ${settings.maxParticipants}\n` +
    `💰 To'lov miqdori: ${settings.starsAmount} ⭐️\n` +
    `🏆 G'oliblar soni: ${settings.winnersCount}\n\n` +
    `Nimani o'zgartirmoqchisiz?`,
    Markup.inlineKeyboard([
      [Markup.button.callback('👥 Qatnashchilar sonini o\'zgartir', 'change_max')],
      [Markup.button.callback('💰 Stars miqdorini o\'zgartir', 'change_stars')],
      [Markup.button.callback('🏆 G\'oliblar sonini o\'zgartir', 'change_winners')]
    ])
  );
});

// 👥 Qatnashchilar
bot.hears('👥 Qatnashchilar', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  const participants = await Participant.find().sort({ joinedAt: 1 });
  const count = participants.length;

  if (count === 0) {
    return ctx.reply('👥 Hali hech kim qatnashmagan');
  }

  let text = `👥 Qatnashchilar ro'yxati (${count} kishi):\n\n`;
  participants.forEach((p, i) => {
    const name = p.username ? `@${p.username}` : `${p.firstName} ${p.lastName}`.trim();
    text += `${i + 1}. ${name}\n`;
  });

  await ctx.reply(text);
});

// 📊 Statistika
bot.hears('📊 Statistika', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  const settings = await getSettings();
  const count = await getParticipantCount();
  const collected = count * settings.starsAmount;
  const nftCost = 8 * 70000;

  await ctx.reply(
    `📊 Turnir statistikasi:\n\n` +
    `👥 Qatnashchilar: ${count}/${settings.maxParticipants}\n` +
    `💰 Yig'ilgan: ${collected} ⭐️\n` +
    `🎁 NFT xarajat: ~${nftCost.toLocaleString()} so'm\n` +
    `👑 Admin foyda: ~${(collected * 0.013 * 12800 - nftCost).toLocaleString()} so'm\n` +
    `📊 Status: ${settings.isActive ? '✅ Faol' : '⏸ Nofaol'}`
  );
});

// 🏆 G'oliblarni aniqlash
bot.hears('🏆 G\'oliblarni aniqlash', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  const settings = await getSettings();
  const participants = await Participant.find();
  const count = participants.length;

  if (count < settings.winnersCount) {
    return ctx.reply(`⚠️ Kamida ${settings.winnersCount} ta qatnashchi kerak!\nHozir: ${count} kishi`);
  }

  await ctx.reply(
    `🎲 ${settings.winnersCount} ta g'olibni random aniqlashni xohlaysizmi?\n\nQatnashchilar: ${count} kishi`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Ha, aniqlash', 'announce_winners')],
      [Markup.button.callback('❌ Yo\'q', 'cancel')]
    ])
  );
});

// 🔄 Turnirni tozalash
bot.hears('🔄 Turnirni tozalash', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  await ctx.reply(
    '⚠️ Barcha qatnashchilar va g\'oliblar o\'chiriladi!\n\nDavom etasizmi?',
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Ha, tozalash', 'clear_all')],
      [Markup.button.callback('❌ Yo\'q', 'cancel')]
    ])
  );
});

// ❌ Bekor qilish
bot.hears('❌ Bekor qilish', async (ctx) => {
  if (!await isAdmin(ctx)) return;
  delete adminState[ADMIN_ID];
  await ctx.reply('❌ Bekor qilindi', Markup.keyboard([
    ['📢 Turnir e\'lon qilish', '⚙️ Sozlamalar'],
    ['👥 Qatnashchilar', '🏆 G\'oliblarni aniqlash'],
    ['📊 Statistika', '🔄 Turnirni tozalash']
  ]).resize());
});

// ============ INLINE CALLBACK ============

// Sozlamalar o'zgartirish
bot.action('change_max', async (ctx) => {
  adminState[ADMIN_ID] = { step: 'change_max' };
  await ctx.reply('👥 Yangi max qatnashchilar sonini kiriting (masalan: 30):');
  await ctx.answerCbQuery();
});

bot.action('change_stars', async (ctx) => {
  adminState[ADMIN_ID] = { step: 'change_stars' };
  await ctx.reply('💰 Yangi Stars miqdorini kiriting (masalan: 200):');
  await ctx.answerCbQuery();
});

bot.action('change_winners', async (ctx) => {
  adminState[ADMIN_ID] = { step: 'change_winners' };
  await ctx.reply('🏆 Yangi g\'oliblar sonini kiriting (masalan: 8):');
  await ctx.answerCbQuery();
});

// G'oliblarni aniqlash
bot.action('announce_winners', async (ctx) => {
  await ctx.answerCbQuery('🎲 Aniqlanyapti...');
  const settings = await getSettings();
  const participants = await Participant.find();

  // Random aralashtirish
  const shuffled = participants.sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, settings.winnersCount);

  // G'oliblarni saqlash
  await Winner.deleteMany({});
  for (let i = 0; i < winners.length; i++) {
    await Winner.create({
      userId: winners[i].userId,
      username: winners[i].username,
      firstName: winners[i].firstName,
      place: i + 1
    });
  }

  // G'oliblar matni
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  let winnersText = '🏆 TURNIR G\'OLIBLARI!\n\n';
  for (let i = 0; i < winners.length; i++) {
    const name = winners[i].username ? `@${winners[i].username}` : winners[i].firstName;
    winnersText += `${medals[i]} ${i + 1}-o'rin: ${name}\n`;
  }
  winnersText += '\n🎁 G\'oliblarga NFT sovrinlar yuboriladi!';

  // Kanalga e'lon
  await ctx.telegram.sendMessage(CHANNEL_ID, winnersText);

  // Har bir g'olibga xabar
  for (let i = 0; i < winners.length; i++) {
    try {
      await ctx.telegram.sendMessage(
        winners[i].userId,
        `🎉 Tabriklaymiz! Siz turnirda ${i + 1}-o'rinni egallаdingiz!\n🎁 Tez orada NFT sovrin yuboriladi!`
      );
    } catch (e) {
      console.log(`Xabar yuborishda xato (${winners[i].userId}):`, e.message);
    }
  }

  await ctx.reply('✅ G\'oliblar aniqlandi va e\'lon qilindi!');
});

// Tozalash
bot.action('clear_all', async (ctx) => {
  await Participant.deleteMany({});
  await Winner.deleteMany({});
  const settings = await getSettings();
  settings.isActive = false;
  settings.channelMessageId = null;
  settings.currentText = null;
  settings.currentPhoto = null;
  await settings.save();
  await ctx.reply('✅ Turnir tozalandi!');
  await ctx.answerCbQuery();
});

bot.action('cancel', async (ctx) => {
  await ctx.answerCbQuery('❌ Bekor qilindi');
});

// ============ QATNASHISH TUGMASI ============
bot.action('join_turnir', async (ctx) => {
  const userId = ctx.from.id;
  const settings = await getSettings();

  // Admin qatnasha olmaydi
  if (userId === ADMIN_ID) {
    return ctx.answerCbQuery('👑 Admin qatnasha olmaydi!', { show_alert: true });
  }

  // Allaqachon qatnashganmi?
  const existing = await Participant.findOne({ userId });
  if (existing) {
    return ctx.answerCbQuery('✅ Siz allaqachon qatnashyapsiz!', { show_alert: true });
  }

  // To'liq to'lganmi?
  const count = await getParticipantCount();
  if (count >= settings.maxParticipants) {
    return ctx.answerCbQuery('❌ Turnir to\'liq! Joy qolmadi.', { show_alert: true });
  }

  // Stars to'lovi
  await ctx.answerCbQuery();
  await ctx.telegram.sendInvoice(userId, {
    title: '🏆 Turnirga qatnashish',
    description: `${settings.starsAmount} ⭐️ to'lab turnirga qo'shiling!`,
    payload: 'turnir_join',
    currency: 'XTR',
    prices: [{ label: 'Qatnashish to\'lovi', amount: settings.starsAmount }],
    provider_token: ''
  });
});

// ============ TO'LOV JARAYONI ============
bot.on('pre_checkout_query', async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on('successful_payment', async (ctx) => {
  const userId = ctx.from.id;
  const settings = await getSettings();

  // Qatnashchi qo'shish
  const existing = await Participant.findOne({ userId });
  if (existing) {
    return ctx.reply('✅ Siz allaqachon qatnashyapsiz!');
  }

  await Participant.create({
    userId,
    username: ctx.from.username || '',
    firstName: ctx.from.first_name || '',
    lastName: ctx.from.last_name || '',
    paymentId: ctx.message.successful_payment.telegram_payment_charge_id
  });

  const count = await getParticipantCount();
  const name = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

  // Foydalanuvchiga xabar
  await ctx.reply(
    `✅ Siz turnirga qo'shildingiz!\n\n` +
    `👥 Qatnashchilar: ${count}/${settings.maxParticipants}\n` +
    `🎮 G'olib bo'lishingizni tilaymiz!`
  );

  // Kanalga xabar
  await ctx.telegram.sendMessage(
    CHANNEL_ID,
    `👤 ${name} turnirga qo'shildi!\n👥 ${count}/${settings.maxParticipants} kishi`
  );

  // Kanal postini yangilash
  await updateChannelPost(ctx, settings);

  // To'liq to'lganda admin ga xabar
  if (count >= settings.maxParticipants) {
    await ctx.telegram.sendMessage(
      ADMIN_ID,
      `🎉 Turnir to'liq yig'ildi! ${count}/${settings.maxParticipants} kishi\n\n` +
      `G'oliblarni aniqlash uchun: /start`
    );
  }
});

// ============ MATN QABUL QILISH ============
bot.on('message', async (ctx) => {
  const userId = ctx.from.id;
  if (userId !== ADMIN_ID) return;

  const state = adminState[ADMIN_ID];
  if (!state) return;

  const settings = await getSettings();

  // Sozlamalar o'zgartirish
  if (state.step === 'change_max') {
    const num = parseInt(ctx.message.text);
    if (isNaN(num) || num < 1) return ctx.reply('❌ Noto\'g\'ri son!');
    settings.maxParticipants = num;
    await settings.save();
    delete adminState[ADMIN_ID];
    return ctx.reply(`✅ Max qatnashchilar: ${num} ga o'zgartirildi!`);
  }

  if (state.step === 'change_stars') {
    const num = parseInt(ctx.message.text);
    if (isNaN(num) || num < 1) return ctx.reply('❌ Noto\'g\'ri son!');
    settings.starsAmount = num;
    await settings.save();
    delete adminState[ADMIN_ID];
    return ctx.reply(`✅ Stars miqdori: ${num} ⭐️ ga o'zgartirildi!`);
  }

  if (state.step === 'change_winners') {
    const num = parseInt(ctx.message.text);
    if (isNaN(num) || num < 1) return ctx.reply('❌ Noto\'g\'ri son!');
    settings.winnersCount = num;
    await settings.save();
    delete adminState[ADMIN_ID];
    return ctx.reply(`✅ G'oliblar soni: ${num} ga o'zgartirildi!`);
  }

  // Turnir e'lon qilish - matn
  if (state.step === 'waiting_message') {
    const count = await getParticipantCount();

    if (ctx.message.photo) {
      // Rasm bilan
      const photo = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      const caption = ctx.message.caption || '🏆 Turnir boshlanmoqda!';
      const fullCaption = `${caption}\n\n` +
        `👥 Qatnashchilar: ${count}/${settings.maxParticipants}\n` +
        `💰 Kirish to'lovi: ${settings.starsAmount} ⭐️\n` +
        `🏆 G'oliblar soni: ${settings.winnersCount} ta`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(`🎮 Qatnashish (${count}/${settings.maxParticipants})`, 'join_turnir')]
      ]);

      const sent = await ctx.telegram.sendPhoto(CHANNEL_ID, photo, {
        caption: fullCaption,
        reply_markup: keyboard.reply_markup
      });

      settings.channelMessageId = sent.message_id;
      settings.currentText = caption;
      settings.currentPhoto = photo;
      settings.isActive = true;
      await settings.save();

    } else if (ctx.message.text) {
      // Faqat matn
      const text = ctx.message.text;
      const fullText = `${text}\n\n` +
        `👥 Qatnashchilar: ${count}/${settings.maxParticipants}\n` +
        `💰 Kirish to'lovi: ${settings.starsAmount} ⭐️\n` +
        `🏆 G'oliblar soni: ${settings.winnersCount} ta`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(`🎮 Qatnashish (${count}/${settings.maxParticipants})`, 'join_turnir')]
      ]);

      const sent = await ctx.telegram.sendMessage(CHANNEL_ID, fullText, {
        reply_markup: keyboard.reply_markup
      });

      settings.channelMessageId = sent.message_id;
      settings.currentText = text;
      settings.currentPhoto = null;
      settings.isActive = true;
      await settings.save();
    }

    delete adminState[ADMIN_ID];
    await ctx.reply('✅ Turnir e\'lon qilindi!');
  }
});

// ============ WEBHOOK & SERVER ============
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

app.use(bot.webhookCallback('/webhook'));

app.get('/', (req, res) => res.send('✅ Turnir Bot ishlayapti!'));

app.listen(PORT, async () => {
  console.log(`🚀 Server ${PORT} portda ishlamoqda`);
  await bot.telegram.setWebhook(`${WEBHOOK_URL}/webhook`);
  console.log(`✅ Webhook o'rnatildi: ${WEBHOOK_URL}/webhook`);
});

module.exports = { bot, app };
