// sensor_node.ino
// ESP32 -> MQTT (JSON payload). Uses DHT22 as example sensor and a relay/LED control.

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "DHT.h"

// Hardware pins
#define DHTPIN 4
#define DHTTYPE DHT22
#define RELAY_PIN 2

DHT dht(DHTPIN, DHTTYPE);
Preferences prefs;

// WiFi / MQTT - stored in prefs or fallback to compile-time defaults
const char* default_ssid = "YOUR_SSID";
const char* default_pass = "YOUR_WIFI_PASS";

const char* mqtt_host = "mqtt"; // docker compose service name or IP
const uint16_t mqtt_port = 1883;
const char* mqtt_user = "iotuser";
const char* mqtt_pass = "iotpass";

String clientId;

WiFiClient espClient;
PubSubClient mqtt(espClient);

const char* baseTopic = "home/room1"; // change per device
String pubTopic = String(baseTopic) + "/sensor";
String subTopic = String(baseTopic) + "/device/relay/set";
String lwtTopic = String(baseTopic) + "/status";

// Forward
void connectWiFi();
void connectMqtt();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void publishSensor();
void publishStatus(const char* status);

unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 5000;

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  dht.begin();

  // load wifi creds from preferences if available
  prefs.begin("wifi", true);
  String ssid = prefs.getString("ssid", default_ssid);
  String pass = prefs.getString("pass", default_pass);
  prefs.end();

  WiFi.begin(ssid.c_str(), pass.c_str());
  connectWiFi();

  clientId = "esp32-" + String((uint32_t)esp_random(), HEX);

  mqtt.setClient(espClient);
  mqtt.setServer(mqtt_host, mqtt_port);
  mqtt.setCallback(mqttCallback);

  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!mqtt.connected()) {
    connectMqtt();
  }

  mqtt.loop();

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    publishSensor();
    lastPublish = now;
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed. Will retry.");
  }
}

void connectMqtt() {
  // set Last Will
  StaticJsonDocument<256> will;
  will["status"] = "offline";
  char willBuf[256];
  serializeJson(will, willBuf);

  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect(clientId.c_str(), mqtt_user, mqtt_pass, lwtTopic.c_str(), 0, true, willBuf)) {
      Serial.println("connected");
      mqtt.subscribe(subTopic.c_str());
      publishStatus("online");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" retrying in 2s");
      delay(2000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.printf("MQTT message on %s: %s\n", topic, msg.c_str());

  if (String(topic) == subTopic) {
    if (msg == "ON") digitalWrite(RELAY_PIN, HIGH);
    else if (msg == "OFF") digitalWrite(RELAY_PIN, LOW);
    else {
      // try parse JSON { "state": "ON" }
      DynamicJsonDocument doc(128);
      DeserializationError err = deserializeJson(doc, msg);
      if (!err && doc.containsKey("state")) {
        String s = doc["state"].as<String>();
        if (s == "ON") digitalWrite(RELAY_PIN, HIGH);
        else digitalWrite(RELAY_PIN, LOW);
      }
    }
  }
}

void publishSensor() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    Serial.println("Failed to read from DHT sensor");
    return;
  }

  DynamicJsonDocument doc(256);
  doc["device"] = clientId;
  doc["temp"] = t;
  doc["hum"] = h;
  doc["ip"] = WiFi.localIP().toString();
  doc["ts"] = millis();

  char buf[256];
  size_t n = serializeJson(doc, buf);

  if (mqtt.publish(pubTopic.c_str(), buf, true)) {
    Serial.println("Published sensor");
  } else {
    Serial.println("Publish failed");
  }
}

void publishStatus(const char* status) {
  DynamicJsonDocument doc(128);
  doc["device"] = clientId;
  doc["status"] = status;
  doc["ts"] = millis();
  char b[128];
  serializeJson(doc, b);
  mqtt.publish(lwtTopic.c_str(), b, true);
}
