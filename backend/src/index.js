require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { initMqtt } = require('./mqttClient');
const authRoutes = require('./routes/auth');
const controlRoutes = require('./routes/control');

const app = express();
const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/iot';
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 1000, max: 20 }));

// routes
app.use('/auth', authRoutes);
app.use('/api', controlRoutes);

// simple ping
app.get('/health', (req,res)=> res.json({ ok: true }));

// socket.io forwarding
io.on('connection', (socket) => {
  console.log('Web client connected', socket.id);
  socket.on('disconnect', () => {
    console.log('Web client disconnected', socket.id);
  });
});

// connect to DB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('Connected to MongoDB'))
  .catch(err => { console.error(err); process.exit(1); });

// initialize mqtt and forward messages to socket.io and save to DB
initMqtt(process.env.MQTT_URL || 'mqtt://localhost:1883', process.env.MQTT_USER, process.env.MQTT_PASS, (topic, message) => {
  io.emit('mqtt', { topic, message });
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
