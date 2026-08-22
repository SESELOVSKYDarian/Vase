// Vase Management - ESP32 + WS2812B warehouse controller
// Wiring used by this installation: GND -> GND, 5V -> 5V, P2/GPIO2 -> DIN.
// Install libraries: Adafruit NeoPixel and ArduinoJson.

#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD";
const char* SERVER_BASE_URL = "https://management.vase.ar";
const char* DEVICE_KEY = "PEGAR_DEVICE_KEY";

const uint8_t LED_PIN = 2;
const uint16_t LED_COUNT = 60;
const uint32_t POLL_INTERVAL_MS = 2000;
const uint8_t BRIGHTNESS = 255;

Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
uint32_t lastPollAt = 0;
uint32_t activeUntil = 0;

String pollUrl() {
  return String(SERVER_BASE_URL) + "/api/warehouse/devices/" + DEVICE_KEY + "/next-command";
}

String completeUrl(const String& commandId) {
  return String(SERVER_BASE_URL) + "/api/warehouse/devices/" + DEVICE_KEY + "/commands/" + commandId + "/complete";
}

void clearStrip() {
  strip.clear();
  strip.show();
  activeUntil = 0;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("WiFi conectando");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi OK: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi ERROR");
  }
}

bool completeCommand(const String& commandId, const char* status, const String& errorMessage = "") {
  WiFiClientSecure client;
  client.setInsecure(); // Para producción, reemplazar por el certificado de management.vase.ar.
  HTTPClient http;
  if (!http.begin(client, completeUrl(commandId))) return false;
  http.addHeader("Content-Type", "application/json");
  String body = String("{\"status\":\"") + status + "\"";
  if (errorMessage.length() > 0) body += String(",\"error\":\"") + errorMessage + "\"";
  body += "}";
  int statusCode = http.POST(body);
  Serial.printf("Complete HTTP: %d\n", statusCode);
  http.end();
  return statusCode >= 200 && statusCode < 300;
}

void showCommand(JsonDocument& command) {
  const String commandId = command["id"].as<String>();
  const int ledNumber = command["ledNumber"] | -1;
  const int activeCount = command["activeCount"] | 0;
  const int durationMs = command["durationMs"] | 5000;
  const int red = command["color"]["r"] | 0;
  const int green = command["color"]["g"] | 80;
  const int blue = command["color"]["b"] | 20;

  if (commandId.length() == 0 || ledNumber < 0 || ledNumber >= LED_COUNT) {
    Serial.println("Comando invalido: LED fuera de rango");
    if (commandId.length() > 0) completeCommand(commandId, "FAILED", "LED fuera de rango en el firmware");
    return;
  }

  strip.clear();
  const int lastLed = min(ledNumber + max(activeCount, 0), (int)LED_COUNT);
  for (int index = ledNumber; index < lastLed; index++) {
    strip.setPixelColor(index, strip.Color(red, green, blue));
  }
  strip.setBrightness(BRIGHTNESS);
  strip.show();
  activeUntil = millis() + max(durationMs, 0);
  Serial.printf("LED %d + %d durante %d ms\n", ledNumber, activeCount, durationMs);
  completeCommand(commandId, "DONE");
}

void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Para producción, reemplazar por el certificado de management.vase.ar.
  HTTPClient http;
  if (!http.begin(client, pollUrl())) return;
  const int statusCode = http.GET();
  Serial.printf("Poll HTTP: %d\n", statusCode);

  if (statusCode == 200) {
    JsonDocument command;
    const DeserializationError error = deserializeJson(command, http.getString());
    if (error) Serial.printf("JSON ERROR: %s\n", error.c_str());
    else showCommand(command);
  } else if (statusCode != 204) {
    Serial.println(http.getString());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  clearStrip();
  connectWifi();
}

void loop() {
  connectWifi();
  if (activeUntil != 0 && (int32_t)(millis() - activeUntil) >= 0) clearStrip();
  if (millis() - lastPollAt >= POLL_INTERVAL_MS) {
    lastPollAt = millis();
    pollCommands();
  }
  delay(20);
}
