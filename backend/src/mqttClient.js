const mqtt = require('mqtt');
const SensorReading = require('./models/SensorReading');

let clientInstance = null;

function initMqtt(brokerUrl, user, pass, onMsg) {
  const opts = {
    clientId: 'backend_bridge_' + Math.random().toString(16).slice(2,10),
    clean: true,
    reconnectPeriod: 2000
  };
  if (user) { opts.username = user; opts.password = pass; }

  const client = mqtt.connect(brokerUrl, opts);
  clientInstance = client;

  client.on('connect', () => {
    console.log('Connected to MQTT broker');
    client.subscribe('home/+/sensor', { qos: 0 }, (err) => {
      if (err) console.error('Subscribe error', err);
    });
    client.subscribe('home/+/status');
  });

  client.on('message', async (topic, payload) => {
    const message = payload.toString();
    console.log('MQTT message', topic, message);
    // optional persist to DB (non-blocking)
    try {
      const reading = new SensorReading({
        topic, payload: message, receivedAt: new Date()
      });
      await reading.save();
    } catch (e) {
      console.error('DB save error', e.message);
    }

    if (typeof onMsg === 'function') onMsg(topic, message);
  });

  client.on('error', (err) => console.error('MQTT Error', err));
  client.on('offline', ()=> console.log('MQTT offline'));

  return client;
}

module.exports = { initMqtt, clientInstance };
