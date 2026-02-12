#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ================== WIFI (OPTIONAL) ==================
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASS";
bool wifiConnected = false;

// ================== MQTT (OPTIONAL) ==================
const char* mqtt_server = "192.168.1.10";
const char* topic = "water/zones/HostelA/sensors";

WiFiClient espClient;
PubSubClient client(espClient);

// ================== PINS ==================
#define FLOW_PIN 27
#define TRIG 26
#define ECHO 25
#define BUZZER 14

#define TANK_HEIGHT_CM 40

// ================== FLOW ==================
volatile int pulseCount = 0;
float flowRate = 0;
float totalLiters = 0;

unsigned long lastUpdate = 0;

// ======================================================
// INTERRUPT
// ======================================================
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

// ======================================================
// SAFE WIFI CONNECT (2 sec timeout)
// ======================================================
void connectWiFi() {

  Serial.println("Connecting WiFi (2s timeout)...");
  WiFi.begin(ssid, password);

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - start < 2000) {
    delay(50);
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("WiFi Connected");
    client.setServer(mqtt_server, 1883);
  } else {
    wifiConnected = false;
    Serial.println("WiFi Skipped (offline mode)");
  }
}

// ======================================================
// ULTRASONIC SAFE
// ======================================================
float getDistance() {

  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG, LOW);

  long duration = pulseIn(ECHO, HIGH, 30000); // timeout 30ms

  if(duration == 0) return TANK_HEIGHT_CM;

  return duration * 0.034 / 2.0;
}

// ======================================================
// OLED
// ======================================================
void updateDisplay(float levelPercent) {

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0,0);

  display.println("Smart Water Node");

  display.print("Flow: ");
  display.print(flowRate,1);
  display.println(" L/m");

  display.print("Total: ");
  display.print(totalLiters,1);
  display.println(" L");

  display.print("Level: ");
  display.print(levelPercent,0);
  display.println("%");

  display.display();
}

// ======================================================
// SETUP
// ======================================================
void setup() {

  Serial.begin(115200);

  pinMode(FLOW_PIN, INPUT_PULLUP);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(BUZZER, OUTPUT);

  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  // OLED FIRST (instant feedback)
  Wire.begin(21,22);

  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)){
    Serial.println("OLED not found!");
  }

  display.clearDisplay();
  display.setCursor(0,0);
  display.println("Booting...");
  display.display();

  // Try WiFi but never block
  connectWiFi();

  lastUpdate = millis();
}

// ======================================================
// LOOP
// ======================================================
void loop() {

  // ===== Every 1 second =====
  if (millis() - lastUpdate >= 1000) {

    noInterrupts();
    int count = pulseCount;
    pulseCount = 0;
    interrupts();

    flowRate = count / 7.5;
    totalLiters += flowRate / 60.0;

    float dist = getDistance();
    float level = TANK_HEIGHT_CM - dist;
    float levelPercent = constrain((level / TANK_HEIGHT_CM) * 100, 0, 100);

    // buzzer
    if(levelPercent < 20 || flowRate > 25)
      tone(BUZZER, 2000);
    else
      noTone(BUZZER);

    updateDisplay(levelPercent);

    // MQTT only if WiFi connected
    if(wifiConnected && client.connected()) {

      String payload = "{";
      payload += "\"flow\":" + String(flowRate);
      payload += ",\"level\":" + String(levelPercent);
      payload += "}";

      client.publish(topic, payload.c_str());
    }

    Serial.print("Flow=");
    Serial.print(flowRate);
    Serial.print("  Level=");
    Serial.println(levelPercent);

    lastUpdate = millis();
  }
}
