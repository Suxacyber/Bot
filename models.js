const mongoose = require('mongoose');

// Turnir sozlamalari
const settingsSchema = new mongoose.Schema({
  maxParticipants: { type: Number, default: 30 },
  starsAmount: { type: Number, default: 200 },
  winnersCount: { type: Number, default: 8 },
  isActive: { type: Boolean, default: false },
  channelMessageId: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Qatnashchilar
const participantSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  username: { type: String, default: '' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now },
  paymentId: { type: String, default: '' }
});

// G'oliblar
const winnerSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  username: { type: String, default: '' },
  firstName: { type: String, default: '' },
  place: { type: Number, required: true },
  announcedAt: { type: Date, default: Date.now }
});

const Settings = mongoose.model('Settings', settingsSchema);
const Participant = mongoose.model('Participant', participantSchema);
const Winner = mongoose.model('Winner', winnerSchema);

module.exports = { Settings, Participant, Winner };
