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
exports.handleIncomingMessage = handleIncomingMessage;
var supabase_admin_1 = require("./supabase-admin");
var date_fns_1 = require("date-fns");
var locale_1 = require("date-fns/locale");
// Simple deterministic state machine
function handleIncomingMessage(message, client) {
    return __awaiter(this, void 0, void 0, function () {
        var phone, text, senderName, conversation, newConv, state, _a, selection, context, selected, _b, _, dateStr, timeStr, err_1;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    phone = message.from;
                    text = (_c = message.body) === null || _c === void 0 ? void 0 : _c.toLowerCase().trim();
                    senderName = message.sender.pushname || 'Cliente';
                    return [4 /*yield*/, supabase_admin_1.supabaseAdmin
                            .from('conversations')
                            .select('*')
                            .eq('phone', phone)
                            .single()];
                case 1:
                    conversation = (_d.sent()).data;
                    if (!!conversation) return [3 /*break*/, 3];
                    return [4 /*yield*/, supabase_admin_1.supabaseAdmin
                            .from('conversations')
                            .insert({ phone: phone, state: 'IDLE', context: {} })
                            .select()
                            .single()];
                case 2:
                    newConv = (_d.sent()).data;
                    conversation = newConv;
                    _d.label = 3;
                case 3: 
                // Register Client if not exists
                return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('clients').upsert({ phone: phone, name: senderName }, { onConflict: 'phone' })];
                case 4:
                    // Register Client if not exists
                    _d.sent();
                    state = conversation.state;
                    if (!(text === 'reset' || text === 'inicio' || text === 'hola')) return [3 /*break*/, 7];
                    return [4 /*yield*/, updateState(phone, 'IDLE', {})];
                case 5:
                    _d.sent();
                    return [4 /*yield*/, client.sendText(phone, "\uD83D\uDC4B Hola ".concat(senderName, "! Soy el asistente virtual de la Coach.\n\nEscrib\u00ED *turno* para reservar una cita.\nEscrib\u00ED *precios* para ver valores.\nEscrib\u00ED *servicios* para ver qu\u00E9 hacemos."))];
                case 6:
                    _d.sent();
                    return [2 /*return*/];
                case 7:
                    _d.trys.push([7, 23, , 26]);
                    _a = state;
                    switch (_a) {
                        case 'IDLE': return [3 /*break*/, 8];
                        case 'CHOOSING_OPTION': return [3 /*break*/, 17];
                    }
                    return [3 /*break*/, 22];
                case 8:
                    if (!((text === null || text === void 0 ? void 0 : text.includes('turno')) || (text === null || text === void 0 ? void 0 : text.includes('cita')) || (text === null || text === void 0 ? void 0 : text.includes('reservar')))) return [3 /*break*/, 10];
                    return [4 /*yield*/, handleTurnoRequest(phone, client)];
                case 9:
                    _d.sent();
                    return [3 /*break*/, 16];
                case 10:
                    if (!((text === null || text === void 0 ? void 0 : text.includes('precio')) || (text === null || text === void 0 ? void 0 : text.includes('valor')))) return [3 /*break*/, 12];
                    return [4 /*yield*/, client.sendText(phone, "💰 *Precios Actuales:*\n\n- Clase Individual: $15.000\n- Pack Mensual (4 clases): $50.000\n\n_Precios sujetos a cambio._")];
                case 11:
                    _d.sent();
                    return [3 /*break*/, 16];
                case 12:
                    if (!((text === null || text === void 0 ? void 0 : text.includes('servicio')) || (text === null || text === void 0 ? void 0 : text.includes('clase')))) return [3 /*break*/, 14];
                    return [4 /*yield*/, client.sendText(phone, "🏋️‍♀️ *Servicios:*\n\n- Fitnes Coaching 1 a 1\n- Planes de entrenamiento online\n- Asesoría nutricional")];
                case 13:
                    _d.sent();
                    return [3 /*break*/, 16];
                case 14: return [4 /*yield*/, client.sendText(phone, "No entendí ese mensaje. 🤔\n\nEscribí *turno* para reservar, o consultá por *precios* o *servicios*.")];
                case 15:
                    _d.sent();
                    _d.label = 16;
                case 16: return [3 /*break*/, 22];
                case 17:
                    selection = parseInt(text || '0');
                    context = conversation.context;
                    if (!(!isNaN(selection) && context.options && context.options[selection - 1])) return [3 /*break*/, 19];
                    selected = context.options[selection - 1];
                    _b = selected.id.split('_'), _ = _b[0], dateStr = _b[1], timeStr = _b[2];
                    return [4 /*yield*/, handleBookingConfirmation(phone, dateStr, timeStr, client)];
                case 18:
                    _d.sent();
                    return [3 /*break*/, 21];
                case 19: return [4 /*yield*/, client.sendText(phone, "Opción no válida. Por favor escribí el NÚMERO de la opción (ej: 1) o escribí *cancelar*.")];
                case 20:
                    _d.sent();
                    _d.label = 21;
                case 21: return [3 /*break*/, 22];
                case 22: return [3 /*break*/, 26];
                case 23:
                    err_1 = _d.sent();
                    console.error("Error in bot logic:", err_1);
                    return [4 /*yield*/, client.sendText(phone, "Ocurrió un error procesando tu solicitud. Por favor intentá de nuevo más tarde.")];
                case 24:
                    _d.sent();
                    return [4 /*yield*/, updateState(phone, 'IDLE', {})];
                case 25:
                    _d.sent();
                    return [3 /*break*/, 26];
                case 26: return [2 /*return*/];
            }
        });
    });
}
// Helpers
function updateState(phone, newState, context) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, supabase_admin_1.supabaseAdmin
                        .from('conversations')
                        .update({ state: newState, context: context, last_message_at: new Date() })
                        .eq('phone', phone)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function handleTurnoRequest(phone, client) {
    return __awaiter(this, void 0, void 0, function () {
        var rules, start, end, blocks, appointments, slots, offeredSlots, msg, contextOptions;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client.sendText(phone, "🗓️ Buscando horarios disponibles para los próximos días...")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('availability_rules').select('*').eq('is_active', true)];
                case 2:
                    rules = (_a.sent()).data;
                    start = new Date();
                    end = (0, date_fns_1.addDays)(start, 14);
                    return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('blocks')
                            .select('*')
                            .gte('end_at', start.toISOString())
                            .lte('start_at', end.toISOString())];
                case 3:
                    blocks = (_a.sent()).data;
                    return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('appointments')
                            .select('*')
                            .eq('status', 'confirmed')
                            .gte('start_at', start.toISOString())
                            .lte('end_at', end.toISOString())];
                case 4:
                    appointments = (_a.sent()).data;
                    slots = generateSlots(start, end, rules || [], blocks || [], appointments || []);
                    if (!(slots.length === 0)) return [3 /*break*/, 6];
                    return [4 /*yield*/, client.sendText(phone, "😔 No encontré turnos disponibles en los próximos 14 días. Por favor escribime manualmente.")];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
                case 6:
                    offeredSlots = slots.slice(0, 5);
                    msg = "👇 *Opciones Disponibles:*\nRespondé con el número de la opción:\n";
                    offeredSlots.forEach(function (slot, idx) {
                        msg += "\n*".concat(idx + 1, ".* ").concat((0, date_fns_1.format)(slot.date, "EEEE d 'de' MMMM - HH:mm", { locale: locale_1.es }), " hs");
                    });
                    contextOptions = offeredSlots.map(function (s) { return ({
                        id: "book_".concat((0, date_fns_1.format)(s.date, 'yyyy-MM-dd'), "_").concat((0, date_fns_1.format)(s.date, 'HH:mm')),
                        label: (0, date_fns_1.format)(s.date, "EEE d HH:mm", { locale: locale_1.es })
                    }); });
                    return [4 /*yield*/, updateState(phone, 'CHOOSING_OPTION', { options: contextOptions })];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, client.sendText(phone, msg)];
                case 8:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function handleBookingConfirmation(phone, dateStr, timeStr, client) {
    return __awaiter(this, void 0, void 0, function () {
        var startAt, endAt, existing, trainers, trainerId, newTrainer, existingClient, clientId, newClient, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startAt = new Date("".concat(dateStr, "T").concat(timeStr, ":00"));
                    endAt = (0, date_fns_1.addHours)(startAt, 1);
                    return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('appointments')
                            .select('id')
                            .eq('status', 'confirmed')
                            .or("and(start_at.lte.".concat(startAt.toISOString(), ",end_at.gt.").concat(startAt.toISOString(), "),and(start_at.lt.").concat(endAt.toISOString(), ",end_at.gte.").concat(endAt.toISOString(), ")"))
                            .single()];
                case 1:
                    existing = (_a.sent()).data;
                    if (!existing) return [3 /*break*/, 4];
                    return [4 /*yield*/, client.sendText(phone, "⚠️ Uh! Ese turno se acaba de ocupar. Por favor pedime *turno* nuevamente.")];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, updateState(phone, 'IDLE', {})];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
                case 4: return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('trainers').select('id').limit(1)];
                case 5:
                    trainers = (_a.sent()).data;
                    trainerId = trainers && trainers.length > 0 ? trainers[0].id : null;
                    if (!!trainerId) return [3 /*break*/, 7];
                    return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('trainers').insert({ display_name: 'Entrenadora' }).select().single()];
                case 6:
                    newTrainer = (_a.sent()).data;
                    trainerId = newTrainer.id;
                    _a.label = 7;
                case 7: return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('clients').select('id').eq('phone', phone).single()];
                case 8:
                    existingClient = (_a.sent()).data;
                    clientId = existingClient === null || existingClient === void 0 ? void 0 : existingClient.id;
                    if (!!clientId) return [3 /*break*/, 10];
                    return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('clients').insert({ phone: phone, name: 'Cliente' }).select().single()];
                case 9:
                    newClient = (_a.sent()).data;
                    clientId = newClient.id;
                    _a.label = 10;
                case 10: return [4 /*yield*/, supabase_admin_1.supabaseAdmin.from('appointments').insert({
                        trainer_id: trainerId,
                        client_id: clientId,
                        start_at: startAt.toISOString(),
                        end_at: endAt.toISOString(),
                        status: 'confirmed',
                        source: 'whatsapp'
                    })];
                case 11:
                    error = (_a.sent()).error;
                    if (!error) return [3 /*break*/, 13];
                    console.error(error);
                    return [4 /*yield*/, client.sendText(phone, "❌ Hubo un error al guardar el turno. Intentá de nuevo.")];
                case 12:
                    _a.sent();
                    return [3 /*break*/, 15];
                case 13: return [4 /*yield*/, client.sendText(phone, "\u2705 *Turno Confirmado!*\n\n\uD83D\uDCC5 ".concat((0, date_fns_1.format)(startAt, "EEEE d 'de' MMMM", { locale: locale_1.es }), "\n\u23F0 ").concat(timeStr, " hs\n\nTe espero! \uD83D\uDCAA"))];
                case 14:
                    _a.sent();
                    _a.label = 15;
                case 15: return [4 /*yield*/, updateState(phone, 'IDLE', {})];
                case 16:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Logic to generate slots
function generateSlots(start, end, rules, blocks, appointments) {
    var slots = [];
    var current = (0, date_fns_1.startOfDay)(start); // Start from today
    var endTime = end;
    var _loop_1 = function () {
        var dayOfWeek = current.getDay() === 0 ? 7 : current.getDay(); // Sunday 0 -> 7
        var dayRules = rules.filter(function (r) { return r.day_of_week === dayOfWeek; });
        var _loop_2 = function (rule) {
            // rule.start_time is "HH:mm:ss"
            var _a = rule.start_time.split(':').map(Number), startH = _a[0], startM = _a[1];
            var _b = rule.end_time.split(':').map(Number), endH = _b[0], endM = _b[1];
            var slotTime = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(current, startH), startM);
            var slotEndTimeLimit = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(current, endH), endM);
            var _loop_3 = function () {
                // Check if slot is in the past
                if (slotTime > new Date()) {
                    var slotEnd_1 = (0, date_fns_1.addHours)(slotTime, 1);
                    // Check collisions
                    var isBlocked = blocks.some(function (b) {
                        var bStart = new Date(b.start_at);
                        var bEnd = new Date(b.end_at);
                        return (slotTime < bEnd && slotEnd_1 > bStart);
                    });
                    var isBooked = appointments.some(function (a) {
                        var aStart = new Date(a.start_at);
                        var aEnd = new Date(a.end_at);
                        return (slotTime < aEnd && slotEnd_1 > aStart);
                    });
                    if (!isBlocked && !isBooked) {
                        slots.push({ date: new Date(slotTime) });
                    }
                }
                slotTime = (0, date_fns_1.addHours)(slotTime, 1);
            };
            while (slotTime < slotEndTimeLimit) {
                _loop_3();
            }
        };
        for (var _i = 0, dayRules_1 = dayRules; _i < dayRules_1.length; _i++) {
            var rule = dayRules_1[_i];
            _loop_2(rule);
        }
        current = (0, date_fns_1.addDays)(current, 1);
    };
    while (current <= endTime) {
        _loop_1();
    }
    return slots;
}
