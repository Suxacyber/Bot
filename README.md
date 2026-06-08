# 🏆 Turnir Bot

Telegram Stars to'lovi bilan ishlaydi. MongoDB database, Render.com deploy.

## ⚙️ O'rnatish

### 1. .env fayl yarating
```
BOT_TOKEN=your_bot_token
MONGODB_URI=your_mongodb_uri
CHANNEL_ID=@your_channel
ADMIN_ID=your_telegram_id
WEBHOOK_URL=https://your-app.onrender.com
PORT=3000
```

### 2. Admin ID olish
@userinfobot ga /start yozing

### 3. Bot tokenini olish
@BotFather → /newbot

### 4. MongoDB URI
MongoDB Atlas → Free cluster → Connect → Get URI

### 5. Render.com deploy
- GitHub ga push qiling
- Render.com → New Web Service
- GitHub repo tanlang
- Environment Variables qo'shing

## 🤖 Bot funksiyalari

### Admin uchun:
- 📢 **Turnir e'lon qilish** — matn yoki rasm + matn yuborish
- ⚙️ **Sozlamalar** — qatnashchilar soni, stars miqdori, g'oliblar soni
- 👥 **Qatnashchilar** — ro'yxat ko'rish
- 🏆 **G'oliblarni aniqlash** — random g'oliblar
- 📊 **Statistika** — yig'ilgan stars, foyda hisob
- 🔄 **Turnirni tozalash** — yangi turnir uchun

### Foydalanuvchi uchun:
- Kanalda "Qatnashish" tugmasi bosadi
- Stars to'laydi
- "Qo'shildingiz" xabari keladi
- Kanalga "Yangi ishtirokchi" e'lon qilinadi
- G'olib bo'lsa xabar keladi
