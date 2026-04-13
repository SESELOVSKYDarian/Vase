"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botClient = void 0;
exports.initBot = initBot;
var wa_automate_1 = require("@open-wa/wa-automate");
var qr_store_1 = require("./qr-store");
var bot_logic_1 = require("./bot-logic");
exports.botClient = null;
function initBot() {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🤖 Initializing OpenWa Bot...');
                    console.log('👀 Listening for QR events...');
                    // Try listening to specific 'qr' event
                    wa_automate_1.ev.on('qr', function (code) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log('📸 QR Code Received (Event: qr)! Length:', code === null || code === void 0 ? void 0 : code.length);
                                    return [4 /*yield*/, (0, qr_store_1.saveQRCode)(code)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, (0, qr_store_1.setBotStatus)('pairing')];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    wa_automate_1.ev.on('qr.**', function (code) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log('📸 QR Code Received (Event: qr.**)! Length:', code === null || code === void 0 ? void 0 : code.length);
                                    return [4 /*yield*/, (0, qr_store_1.saveQRCode)(code)];
                                case 1:
                                    _a.sent(); // 'code' is the data URL (base64 image)
                                    return [4 /*yield*/, (0, qr_store_1.setBotStatus)('pairing')];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 7]);
                    return [4 /*yield*/, (0, wa_automate_1.create)({
                            sessionId: "ATLAS_COACHBOT",
                            multiDevice: true,
                            authTimeout: 0, // Wait forever
                            blockCrashLogs: true,
                            disableSpins: true,
                            headless: true,
                            hostNotificationLang: 'es',
                            logConsole: false,
                            popup: false,
                            qrTimeout: 0,
                            useChrome: true,
                            onQrRefresh: function (qr) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            console.log('📸 QR Code Received (onQrRefresh)!');
                                            return [4 /*yield*/, (0, qr_store_1.saveQRCode)(qr)];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, (0, qr_store_1.setBotStatus)('pairing')];
                                        case 2:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); },
                        })];
                case 2:
                    exports.botClient = _a.sent();
                    console.log('✅ Bot Connected successfully!');
                    return [4 /*yield*/, (0, qr_store_1.setBotStatus)('connected')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, qr_store_1.saveQRCode)('')];
                case 4:
                    _a.sent(); // Clear QR code
                    // Message Listener
                    exports.botClient.onMessage(function (message) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: 
                                // We pass the client instance so logic can reply
                                return [4 /*yield*/, (0, bot_logic_1.handleIncomingMessage)(message, exports.botClient)];
                                case 1:
                                    // We pass the client instance so logic can reply
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    // State Listener
                    exports.botClient.onStateChanged(function (state) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log('Bot State Change:', state);
                                    if (!(state === 'CONNECTED')) return [3 /*break*/, 2];
                                    return [4 /*yield*/, (0, qr_store_1.setBotStatus)('connected')];
                                case 1:
                                    _a.sent();
                                    _a.label = 2;
                                case 2:
                                    if (!(state === 'CONFLICT' || state === 'UNLAUNCHED')) return [3 /*break*/, 4];
                                    return [4 /*yield*/, (0, qr_store_1.setBotStatus)('disconnected')];
                                case 3:
                                    _a.sent();
                                    _a.label = 4;
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    return [3 /*break*/, 7];
                case 5:
                    err_1 = _a.sent();
                    console.error('❌ Bot Initialization Failed:', err_1);
                    return [4 /*yield*/, (0, qr_store_1.setBotStatus)('disconnected')];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
