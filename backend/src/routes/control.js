const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_this';

// simple auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing auth header' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid auth header' });
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.post('/publish', authMiddleware, (req, res) => {
  const { topic, message } = req.body;
  if (!topic || typeof message === 'undefined') return res.status(400).json({ error: 'topic and message required' });

  const mqttModule = require('../mqttClient');
  const mqttClient = mqttModule.clientInstance;
  if (!mqttClient) return res.status(500).json({ error: 'MQTT client not available' });

  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  mqttClient.publish(topic, payload, { qos: 0 }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

module.exports = router;
