// Vase Management - ESP32 + WS2812B warehouse controller
// Wiring used by this installation: GND -> GND, 5V -> 5V, P2/GPIO2 -> DIN.
// Install libraries: Adafruit NeoPixel and ArduinoJson.

#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <WebServer.h>

const char* INITIAL_WIFI_SSID = "Barra";
const char* INITIAL_WIFI_PASSWORD = "75575775";
const char* FALLBACK_WIFI_SSID = "WIFI Damac N4164 ";
const char* FALLBACK_WIFI_PASSWORD = "dmc4164nqn";
const char* SECONDARY_WIFI_SSID = "Barra";
const char* SECONDARY_WIFI_PASSWORD = "75575775";
const char* INITIAL_SERVER_BASE_URL = "https://management.vase.ar";
const char* DEVICE_KEY = "e7561371c56cb464cf12bfa0254f1b31e693bcff5396d601";

const uint8_t LED_PIN = 2;
const uint16_t INITIAL_LED_COUNT = 100;
const uint32_t POLL_INTERVAL_MS = 2000;
const uint32_t CONFIG_INTERVAL_MS = 10000;

Preferences preferences;
WebServer configServer(80);
Adafruit_NeoPixel strip(INITIAL_LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
String wifiSsid;
String wifiPassword;
String serverBaseUrl;
uint16_t ledCount = INITIAL_LED_COUNT;
uint8_t brightness = 255;
uint32_t lastPollAt = 0;
uint32_t lastConfigAt = 0;
uint32_t activeUntil = 0;
uint32_t lastWifiRetryAt = 0;
bool provisioningMode = false;

String pollUrl() {
  return serverBaseUrl + "/api/warehouse/devices/" + DEVICE_KEY + "/next-command";
}

String completeUrl(const String& commandId) {
  return serverBaseUrl + "/api/warehouse/devices/" + DEVICE_KEY + "/commands/" + commandId + "/complete";
}

String configUrl() {
  return serverBaseUrl + "/api/warehouse/devices/" + DEVICE_KEY + "/config";
}

void clearStrip() {
  strip.clear();
  strip.show();
  activeUntil = 0;
}

bool tryWifi(const char* ssid, const char* password, uint32_t timeoutMs = 15000) {
  if (!ssid || strlen(ssid) == 0) return false;
  Serial.print("WiFi probando: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(150);
  WiFi.begin(ssid, password);
  const uint32_t startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < timeoutMs) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi OK: ");
    Serial.println(WiFi.localIP());
  }
  return WiFi.status() == WL_CONNECTED;
}

void saveLocalConfig();
void connectWifi();

String provisioningPage() {
  String html = "<!doctype html><html lang='es'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Configurar Vase ESP32</title><style>body{font-family:system-ui;max-width:520px;margin:40px auto;padding:0 18px;background:#101615;color:#f2f7f4}input{display:block;width:100%;box-sizing:border-box;margin:8px 0 18px;padding:12px;border-radius:8px;border:1px solid #456054;background:#18231f;color:white}button{padding:12px 18px;border:0;border-radius:8px;background:#34d399;color:#062017;font-weight:700}</style><h1>Vase ESP32</h1><p>Configurá el Wi‑Fi y la conexión del depósito.</p><form method='post' action='/save'><label>Wi‑Fi</label><input name='ssid' value='" + wifiSsid + "' required><label>Contraseña</label><input name='password' type='password' value='" + wifiPassword + "' required><label>Servidor</label><input name='server' value='" + serverBaseUrl + "' required><label>Device key</label><input name='deviceKey' value='" + DEVICE_KEY + "' readonly><button>Guardar y conectar</button></form></html>";
  return html;
}

void startProvisioningPortal() {
  if (provisioningMode) return;
  WiFi.mode(WIFI_AP_STA);
  String suffix = String((uint32_t)ESP.getEfuseMac(), HEX).substring(6);
  String apName = "Vase-ESP32-" + suffix;
  WiFi.softAP(apName.c_str(), "vaseesp32");
  configServer.on("/", HTTP_GET, []() { configServer.send(200, "text/html; charset=utf-8", provisioningPage()); });
  configServer.on("/save", HTTP_POST, []() {
    if (!configServer.hasArg("ssid") || !configServer.hasArg("password") || !configServer.hasArg("server")) {
      configServer.send(400, "text/plain", "Faltan datos");
      return;
    }
    wifiSsid = configServer.arg("ssid");
    wifiPassword = configServer.arg("password");
    serverBaseUrl = configServer.arg("server");
    saveLocalConfig();
    configServer.send(200, "text/html; charset=utf-8", "<h1>Guardado</h1><p>El ESP32 está intentando conectarse. Podés cerrar esta red.</p>");
    provisioningMode = false;
    configServer.stop();
    WiFi.softAPdisconnect(true);
    delay(300);
    connectWifi();
  });
  configServer.begin();
  provisioningMode = true;
  Serial.print("Portal WiFi: ");
  Serial.println(apName);
  Serial.println("Abrir http://192.168.4.1");
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (tryWifi(wifiSsid.c_str(), wifiPassword.c_str()) ||
      tryWifi(FALLBACK_WIFI_SSID, FALLBACK_WIFI_PASSWORD) ||
      tryWifi(SECONDARY_WIFI_SSID, SECONDARY_WIFI_PASSWORD)) {
    provisioningMode = false;
    return;
  }
  startProvisioningPortal();
}

void loadLocalConfig() {
  preferences.begin("warehouse", true);
  wifiSsid = preferences.getString("ssid", INITIAL_WIFI_SSID);
  wifiPassword = preferences.getString("password", INITIAL_WIFI_PASSWORD);
  serverBaseUrl = preferences.getString("server", INITIAL_SERVER_BASE_URL);
  ledCount = preferences.getUShort("ledCount", INITIAL_LED_COUNT);
  brightness = preferences.getUChar("brightness", 255);
  preferences.end();
  if (ledCount < 1 || ledCount > 300) ledCount = INITIAL_LED_COUNT;
  strip.updateLength(ledCount);
  strip.setBrightness(brightness);
}

void saveLocalConfig() {
  preferences.begin("warehouse", false);
  preferences.putString("ssid", wifiSsid);
  preferences.putString("password", wifiPassword);
  preferences.putString("server", serverBaseUrl);
  preferences.putUShort("ledCount", ledCount);
  preferences.putUChar("brightness", brightness);
  preferences.end();
}

void pollConfig() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, configUrl())) return;
  const int statusCode = http.GET();
  Serial.printf("Config HTTP: %d\n", statusCode);
  if (statusCode == 200) {
    JsonDocument config;
    if (!deserializeJson(config, http.getString())) {
      const String nextSsid = config["wifiSsid"] | wifiSsid;
      const String nextPassword = config["wifiPassword"] | wifiPassword;
      const String nextServer = config["serverBaseUrl"] | serverBaseUrl;
      const uint16_t nextLedCount = constrain((int)(config["ledCount"] | ledCount), 1, 300);
      const uint8_t nextBrightness = constrain((int)(config["brightness"] | brightness), 0, 255);
      const bool wifiChanged = nextSsid != wifiSsid || nextPassword != wifiPassword;
      wifiSsid = nextSsid;
      wifiPassword = nextPassword;
      serverBaseUrl = nextServer;
      ledCount = nextLedCount;
      brightness = nextBrightness;
      strip.updateLength(ledCount);
      strip.setBrightness(brightness);
      saveLocalConfig();
      if (wifiChanged) {
        WiFi.disconnect();
        delay(200);
        connectWifi();
      }
    }
  }
  http.end();
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
  JsonObject color = command["color"].as<JsonObject>();
  const int red = constrain((int)(color["r"] | 0), 0, 255);
  const int green = constrain((int)(color["g"] | 80), 0, 255);
  const int blue = constrain((int)(color["b"] | 20), 0, 255);
  JsonArray ledNumbers = command["ledNumbers"].as<JsonArray>();

  if (commandId.length() == 0 || ledNumber < 0 || ledNumber >= ledCount) {
    Serial.println("Comando invalido: LED fuera de rango");
    if (commandId.length() > 0) completeCommand(commandId, "FAILED", "LED fuera de rango en el firmware");
    return;
  }

  strip.clear();
  if (!ledNumbers.isNull() && ledNumbers.size() > 0) {
    for (JsonVariant value : ledNumbers) {
      const int index = value.as<int>();
      if (index < 0 || index >= ledCount) {
        Serial.printf("Comando invalido: LED %d fuera de rango\n", index);
        completeCommand(commandId, "FAILED", "Lista de LEDs fuera de rango en el firmware");
        return;
      }
      strip.setPixelColor(index, strip.Color(red, green, blue));
    }
  } else {
    const int lastLed = min(ledNumber + max(activeCount, 0), (int)ledCount);
    for (int index = ledNumber; index < lastLed; index++) {
      strip.setPixelColor(index, strip.Color(red, green, blue));
    }
  }
  strip.setBrightness(brightness);
  strip.show();
  activeUntil = millis() + max(durationMs, 0);
  Serial.printf("LEDs %d durante %d ms\n", ledNumbers.isNull() ? activeCount : ledNumbers.size(), durationMs);
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
  loadLocalConfig();
  strip.setBrightness(brightness);
  clearStrip();
  connectWifi();
}

void loop() {
  if (provisioningMode) {
    configServer.handleClient();
    if (millis() - lastWifiRetryAt >= 20000) {
      lastWifiRetryAt = millis();
      provisioningMode = false;
      configServer.stop();
      WiFi.softAPdisconnect(true);
      connectWifi();
    }
  } else {
    connectWifi();
  }
  if (activeUntil != 0 && (int32_t)(millis() - activeUntil) >= 0) clearStrip();
  if (millis() - lastConfigAt >= CONFIG_INTERVAL_MS) {
    lastConfigAt = millis();
    pollConfig();
  }
  if (millis() - lastPollAt >= POLL_INTERVAL_MS) {
    lastPollAt = millis();
    pollCommands();
  }
  delay(20);
}
