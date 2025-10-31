const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema({
  topic: { type: String, required: true, index: true },
  payload: { type: String, required: true },
  parsed: { type: mongoose.Schema.Types.Mixed },
  receivedAt: { type: Date, default: Date.now, index: true }
});

SensorReadingSchema.pre('save', function(next) {
  if (!this.parsed) {
    try {
      this.parsed = JSON.parse(this.payload);
    } catch (e) {
      this.parsed = null;
    }
  }
  next();
});

module.exports = mongoose.model('SensorReading', SensorReadingSchema);
