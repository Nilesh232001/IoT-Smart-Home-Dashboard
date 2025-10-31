const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_this';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || null; // provide hashed password ideally
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

function generateToken(user) {
  return jwt.sign({ user }, JWT_SECRET, { expiresIn: '8h' });
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });

  if (username !== ADMIN_USER) return res.status(401).json({ error: 'invalid credentials' });

  if (ADMIN_PASS_HASH) {
    const ok = await bcrypt.compare(password, ADMIN_PASS_HASH);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  } else {
    if (password !== ADMIN_PASS) return res.status(401).json({ error: 'invalid credentials' });
  }

  const token = generateToken({ username });
  res.json({ token });
});

module.exports = router;
