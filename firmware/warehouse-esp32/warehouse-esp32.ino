// Vase Management - ESP32 + W5500 + WS2812B.
// AUTO: Wi-Fi primero (celular, local, Barra) y Ethernet como ultimo respaldo.
// Requiere Arduino ESP32 core 3.x, Adafruit NeoPixel y ArduinoJson.

#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include <ETH.h>
#include <HTTPClient.h>
#include <Network.h>
#include <NetworkClientSecure.h>
#include <Preferences.h>
#include <SPI.h>
#include <WebServer.h>
#include <WiFi.h>

const char* INITIAL_WIFI_SSID = "";
const char* INITIAL_WIFI_PASSWORD = "";
const char* INITIAL_SERVER_BASE_URL = "https://management.vase.ar";
const char* DEVICE_KEY = "e7561371c56cb464cf12bfa0254f1b31e693bcff5396d601";
const char* INITIAL_NETWORK_MODE = "AUTO"; // AUTO | ETHERNET | WIFI

// W5500 por SPI. Cambiar solo si el cableado fisico usa otros pines.
const int ETH_PHY_ADDR = 1;
const int ETH_PHY_CS = 15;
const int ETH_PHY_IRQ = 4;
const int ETH_PHY_RST = 5;
const int ETH_SPI_SCK = 14;
const int ETH_SPI_MISO = 12;
const int ETH_SPI_MOSI = 13;

const uint8_t LED_PIN = 2;
const uint16_t INITIAL_LED_COUNT = 100;
const uint32_t POLL_INTERVAL_MS = 2000;
const uint32_t CONFIG_INTERVAL_MS = 10000;
const uint32_t NETWORK_RETRY_INTERVAL_MS = 20000;

Preferences preferences;
WebServer configServer(80);
Adafruit_NeoPixel strip(INITIAL_LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
String wifiSsid, wifiPassword;
String wifiFallbackSsid, wifiFallbackPassword;
String wifiSecondarySsid, wifiSecondaryPassword;
String serverBaseUrl, networkMode;
uint16_t ledCount = INITIAL_LED_COUNT;
uint8_t brightness = 255;
uint32_t lastPollAt = 0, lastConfigAt = 0, activeUntil = 0, lastNetworkRetryAt = 0;
bool provisioningMode = false;
bool ethernetStarted = false;

String normalizedNetworkMode(const String& value) {
  String normalized = value;
  normalized.trim();
  normalized.toUpperCase();
  if (normalized == "ETHERNET" || normalized == "WIFI") return normalized;
  return "AUTO";
}

bool ethernetConnected() { return ethernetStarted && ETH.hasIP(); }
bool wifiConnected() { return WiFi.status() == WL_CONNECTED; }
bool networkConnected() { return ethernetConnected() || wifiConnected(); }

String activeTransport() {
  if (ethernetConnected()) return "ethernet";
  if (wifiConnected()) return "wifi";
  return "offline";
}

String activeIpAddress() {
  if (ethernetConnected()) return ETH.localIP().toString();
  if (wifiConnected()) return WiFi.localIP().toString();
  return "";
}

String withTelemetry(const String& url) {
  return url + "?transport=" + activeTransport() + "&ip=" + activeIpAddress();
}

String pollUrl() { return withTelemetry(serverBaseUrl + "/api/warehouse/devices/" + DEVICE_KEY + "/next-command"); }
String configUrl() { return withTelemetry(serverBaseUrl + "/api/warehouse/devices/" + DEVICE_KEY + "/config"); }
String completeUrl(const String& commandId) {
  return serverBaseUrl + "/api/warehouse/devices/" + DEVICE_KEY + "/commands/" + commandId + "/complete";
}

void clearStrip() {
  strip.clear();
  strip.show();
  activeUntil = 0;
}

void onNetworkEvent(arduino_event_id_t event, arduino_event_info_t info) {
  (void)info;
  switch (event) {
    case ARDUINO_EVENT_ETH_START:
      ETH.setHostname("vase-warehouse");
      Serial.println("Ethernet iniciado");
      break;
    case ARDUINO_EVENT_ETH_CONNECTED:
      Serial.println("Cable Ethernet conectado");
      break;
    case ARDUINO_EVENT_ETH_GOT_IP:
      Serial.print("Ethernet OK: ");
      Serial.println(ETH.localIP());
      break;
    case ARDUINO_EVENT_ETH_LOST_IP:
    case ARDUINO_EVENT_ETH_DISCONNECTED:
      Serial.println("Ethernet sin conexion");
      break;
    default: break;
  }
}

void startEthernet() {
  if (ethernetStarted || networkMode == "WIFI") return;
  Serial.println("Iniciando W5500...");
  SPI.begin(ETH_SPI_SCK, ETH_SPI_MISO, ETH_SPI_MOSI);
  ethernetStarted = ETH.begin(ETH_PHY_W5500, ETH_PHY_ADDR, ETH_PHY_CS, ETH_PHY_IRQ, ETH_PHY_RST, SPI);
  if (!ethernetStarted) Serial.println("No se pudo iniciar el W5500");
}

bool tryWifiProfile(const String& ssid, const String& password, uint32_t timeoutMs) {
  if (ssid.length() == 0) return false;
  if (wifiConnected()) return true;
  Serial.print("Wi-Fi probando: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(150);
  WiFi.begin(ssid.c_str(), password.c_str());
  const uint32_t startedAt = millis();
  while (!wifiConnected() && millis() - startedAt < timeoutMs) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (wifiConnected()) {
    Serial.print("Wi-Fi OK: ");
    Serial.println(WiFi.localIP());
  }
  return wifiConnected();
}

bool tryWifi(uint32_t timeoutMs = 10000) {
  if (networkMode == "ETHERNET") return false;
  if (tryWifiProfile(wifiSsid, wifiPassword, timeoutMs)) return true;
  if (tryWifiProfile(wifiFallbackSsid, wifiFallbackPassword, timeoutMs)) return true;
  return tryWifiProfile(wifiSecondarySsid, wifiSecondaryPassword, timeoutMs);
}

void saveLocalConfig();

String provisioningPage() {
  return "<!doctype html><html lang='es'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Vase ESP32</title><style>body{font-family:system-ui;max-width:560px;margin:24px auto;padding:0 18px;background:#101615;color:#f2f7f4}input,select{display:block;width:100%;box-sizing:border-box;margin:8px 0 18px;padding:12px;border-radius:8px;border:1px solid #456054;background:#18231f;color:white}button{padding:12px 18px;border:0;border-radius:8px;background:#34d399;color:#062017;font-weight:700}.hint{color:#a7b8b0;font-size:13px}</style><h1>Vase ESP32</h1><p>Configuracion de red del deposito.</p><p class='hint'>Se prueban en orden: celular, Wi-Fi del local y Barra.</p><form method='post' action='/save'><label>Modo</label><select name='mode'><option value='AUTO'" + String(networkMode == "AUTO" ? " selected" : "") + ">Wi-Fi primero y Ethernet de respaldo</option><option value='ETHERNET'" + String(networkMode == "ETHERNET" ? " selected" : "") + ">Solo Ethernet</option><option value='WIFI'" + String(networkMode == "WIFI" ? " selected" : "") + ">Solo Wi-Fi</option></select><label>Wi-Fi principal (celular)</label><input name='ssid' value='" + wifiSsid + "'><label>Contraseña principal</label><input name='password' type='password' value='" + wifiPassword + "'><label>Wi-Fi alternativo (local)</label><input name='ssid2' value='" + wifiFallbackSsid + "'><label>Contraseña alternativa</label><input name='password2' type='password' value='" + wifiFallbackPassword + "'><label>Wi-Fi secundario (Barra)</label><input name='ssid3' value='" + wifiSecondarySsid + "'><label>Contraseña secundaria</label><input name='password3' type='password' value='" + wifiSecondaryPassword + "'><label>Servidor</label><input name='server' value='" + serverBaseUrl + "' required><label>Device key</label><input value='" + String(DEVICE_KEY) + "' readonly><button>Guardar y reiniciar</button></form></html>";
}

void startProvisioningPortal() {
  if (provisioningMode) return;
  WiFi.mode(WIFI_AP_STA);
  String suffix = String((uint32_t)ESP.getEfuseMac(), HEX).substring(6);
  String apName = "Vase-ESP32-" + suffix;
  WiFi.softAP(apName.c_str(), "vaseesp32");
  configServer.on("/", HTTP_GET, []() { configServer.send(200, "text/html; charset=utf-8", provisioningPage()); });
  configServer.on("/save", HTTP_POST, []() {
    if (!configServer.hasArg("mode") || !configServer.hasArg("server")) {
      configServer.send(400, "text/plain", "Faltan datos");
      return;
    }
    networkMode = normalizedNetworkMode(configServer.arg("mode"));
    wifiSsid = configServer.arg("ssid");
    wifiPassword = configServer.arg("password");
    wifiFallbackSsid = configServer.arg("ssid2");
    wifiFallbackPassword = configServer.arg("password2");
    wifiSecondarySsid = configServer.arg("ssid3");
    wifiSecondaryPassword = configServer.arg("password3");
    serverBaseUrl = configServer.arg("server");
    saveLocalConfig();
    configServer.send(200, "text/html; charset=utf-8", "<h1>Guardado</h1><p>El ESP32 se reiniciara.</p>");
    delay(800);
    ESP.restart();
  });
  configServer.begin();
  provisioningMode = true;
  Serial.print("Portal de recuperacion: ");
  Serial.println(apName);
  Serial.println("Abrir http://192.168.4.1");
}

void loadLocalConfig() {
  preferences.begin("warehouse", true);
  wifiSsid = preferences.getString("ssid", INITIAL_WIFI_SSID);
  wifiPassword = preferences.getString("password", INITIAL_WIFI_PASSWORD);
  wifiFallbackSsid = preferences.getString("ssid2", "");
  wifiFallbackPassword = preferences.getString("password2", "");
  wifiSecondarySsid = preferences.getString("ssid3", "");
  wifiSecondaryPassword = preferences.getString("password3", "");
  serverBaseUrl = preferences.getString("server", INITIAL_SERVER_BASE_URL);
  networkMode = normalizedNetworkMode(preferences.getString("netMode", INITIAL_NETWORK_MODE));
  ledCount = preferences.getUShort("ledCount", INITIAL_LED_COUNT);
  brightness = preferences.getUChar("brightness", 255);
  preferences.end();
  if (ledCount < 1 || ledCount > 1000) ledCount = INITIAL_LED_COUNT;
  strip.updateLength(ledCount);
  strip.setBrightness(brightness);
}

void saveLocalConfig() {
  preferences.begin("warehouse", false);
  preferences.putString("ssid", wifiSsid);
  preferences.putString("password", wifiPassword);
  preferences.putString("ssid2", wifiFallbackSsid);
  preferences.putString("password2", wifiFallbackPassword);
  preferences.putString("ssid3", wifiSecondarySsid);
  preferences.putString("password3", wifiSecondaryPassword);
  preferences.putString("server", serverBaseUrl);
  preferences.putString("netMode", networkMode);
  preferences.putUShort("ledCount", ledCount);
  preferences.putUChar("brightness", brightness);
  preferences.end();
}

void connectNetworkAtBoot() {
  if (networkMode != "ETHERNET") tryWifi();
  if (!networkConnected() && networkMode != "WIFI") {
    startEthernet();
    const uint32_t startedAt = millis();
    while (!ethernetConnected() && millis() - startedAt < 12000) delay(250);
  }
  if (!networkConnected()) startProvisioningPortal();
}

void retryNetwork() {
  if (networkConnected()) return;
  if (networkMode != "ETHERNET") tryWifi(7000);
  if (!networkConnected() && networkMode != "WIFI") startEthernet();
  if (!networkConnected()) startProvisioningPortal();
}

void pollConfig() {
  if (!networkConnected()) return;
  NetworkClientSecure client;
  client.setInsecure(); // TODO: instalar la CA de management.vase.ar.
  HTTPClient http;
  if (!http.begin(client, configUrl())) return;
  const int statusCode = http.GET();
  Serial.printf("Config HTTP: %d (%s)\n", statusCode, activeTransport().c_str());
  if (statusCode == 200) {
    JsonDocument config;
    if (!deserializeJson(config, http.getString())) {
      const String nextSsid = config["wifiSsid"] | wifiSsid;
      const String nextPassword = config["wifiPassword"] | wifiPassword;
      const String nextFallbackSsid = config["wifiFallbackSsid"] | wifiFallbackSsid;
      const String nextFallbackPassword = config["wifiFallbackPassword"] | wifiFallbackPassword;
      const String nextSecondarySsid = config["wifiSecondarySsid"] | wifiSecondarySsid;
      const String nextSecondaryPassword = config["wifiSecondaryPassword"] | wifiSecondaryPassword;
      const String nextServer = config["serverBaseUrl"] | serverBaseUrl;
      const String nextMode = normalizedNetworkMode(config["networkMode"] | networkMode);
      const uint16_t nextLedCount = constrain((int)(config["ledCount"] | ledCount), 1, 1000);
      const uint8_t nextBrightness = constrain((int)(config["brightness"] | brightness), 0, 255);
      const bool restartRequired = nextMode != networkMode || nextSsid != wifiSsid || nextPassword != wifiPassword || nextFallbackSsid != wifiFallbackSsid || nextFallbackPassword != wifiFallbackPassword || nextSecondarySsid != wifiSecondarySsid || nextSecondaryPassword != wifiSecondaryPassword;
      wifiSsid = nextSsid;
      wifiPassword = nextPassword;
      wifiFallbackSsid = nextFallbackSsid;
      wifiFallbackPassword = nextFallbackPassword;
      wifiSecondarySsid = nextSecondarySsid;
      wifiSecondaryPassword = nextSecondaryPassword;
      serverBaseUrl = nextServer;
      networkMode = nextMode;
      ledCount = nextLedCount;
      brightness = nextBrightness;
      strip.updateLength(ledCount);
      strip.setBrightness(brightness);
      saveLocalConfig();
      if (restartRequired) {
        Serial.println("Cambio de red recibido. Reiniciando...");
        delay(500);
        ESP.restart();
      }
    }
  }
  http.end();
}

bool completeCommand(const String& commandId, const char* status, const String& errorMessage = "") {
  if (!networkConnected()) return false;
  NetworkClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, completeUrl(commandId))) return false;
  http.addHeader("Content-Type", "application/json");
  String body = String("{\"status\":\"") + status + "\"";
  if (errorMessage.length() > 0) body += String(",\"error\":\"") + errorMessage + "\"";
  body += "}";
  const int statusCode = http.POST(body);
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
    if (commandId.length() > 0) completeCommand(commandId, "FAILED", "LED fuera de rango en el firmware");
    return;
  }
  strip.clear();
  if (!ledNumbers.isNull() && ledNumbers.size() > 0) {
    for (JsonVariant value : ledNumbers) {
      const int index = value.as<int>();
      if (index < 0 || index >= ledCount) {
        completeCommand(commandId, "FAILED", "Lista de LEDs fuera de rango en el firmware");
        return;
      }
      strip.setPixelColor(index, strip.Color(red, green, blue));
    }
  } else {
    const int lastLed = min(ledNumber + max(activeCount, 0), (int)ledCount);
    for (int index = ledNumber; index < lastLed; index++) strip.setPixelColor(index, strip.Color(red, green, blue));
  }
  strip.setBrightness(brightness);
  strip.show();
  activeUntil = millis() + max(durationMs, 0);
  completeCommand(commandId, "DONE");
}

void pollCommands() {
  if (!networkConnected()) return;
  NetworkClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, pollUrl())) return;
  const int statusCode = http.GET();
  Serial.printf("Poll HTTP: %d (%s)\n", statusCode, activeTransport().c_str());
  if (statusCode == 200) {
    JsonDocument command;
    const DeserializationError error = deserializeJson(command, http.getString());
    if (error) Serial.printf("JSON ERROR: %s\n", error.c_str());
    else showCommand(command);
  } else if (statusCode != 204) Serial.println(http.getString());
  http.end();
}

void setup() {
  Serial.begin(115200);
  strip.begin();
  loadLocalConfig();
  strip.setBrightness(brightness);
  clearStrip();
  Network.onEvent(onNetworkEvent);
  connectNetworkAtBoot();
}

void loop() {
  if (provisioningMode) configServer.handleClient();
  if (!networkConnected() && millis() - lastNetworkRetryAt >= NETWORK_RETRY_INTERVAL_MS) {
    lastNetworkRetryAt = millis();
    retryNetwork();
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
