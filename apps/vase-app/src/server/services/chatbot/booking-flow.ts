import type { TenantChatbotConfig } from "@/server/services/chatbot/tenant-chatbot-config";

type BookingServiceItem = {
  id?: string;
  name: string;
  durationMinutes?: number;
  priceLabel?: string;
};

export function readConfiguredBookingServices(config: TenantChatbotConfig): BookingServiceItem[] {
  const services = config.bookingConfiguration.services;
  if (!Array.isArray(services)) {
    return [];
  }

  return services
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : undefined,
      name: typeof item.name === "string" ? item.name : "Servicio",
      durationMinutes:
        typeof item.durationMinutes === "number"
          ? item.durationMinutes
          : typeof item.duration === "number"
            ? item.duration
            : undefined,
      priceLabel: typeof item.priceLabel === "string" ? item.priceLabel : undefined,
    }));
}

export function shouldStartBookingFlow(text: string, config: TenantChatbotConfig) {
  if (!config.bookingEnabled) {
    return false;
  }

  const normalized = text.toLowerCase();
  return ["turno", "reserva", "reservar", "cita", "agenda"].some((keyword) =>
    normalized.includes(keyword),
  );
}

export function buildBookingStartMessage(config: TenantChatbotConfig) {
  const services = readConfiguredBookingServices(config);

  if (!services.length) {
    return "Puedo ayudarte con reservas, pero este tenant todavia no configuró servicios disponibles.";
  }

  const lines = services.map((service, index) => {
    const duration = service.durationMinutes ? ` (${service.durationMinutes} min)` : "";
    const price = service.priceLabel ? ` - ${service.priceLabel}` : "";
    return `${index + 1}. ${service.name}${duration}${price}`;
  });

  return [
    "Estos son los servicios disponibles para reservar:",
    ...lines,
    "",
    "Respondé con el número del servicio que te interesa.",
  ].join("\n");
}

export function resolveBookingReply(input: {
  text: string;
  config: TenantChatbotConfig;
  metadata: { state?: string; context?: Record<string, unknown> };
}) {
  const services = readConfiguredBookingServices(input.config);
  const state = input.metadata.state || "IDLE";

  if (state === "CHOOSING_SERVICE") {
    const selectedIndex = Number.parseInt(input.text.trim(), 10) - 1;
    const selectedService = services[selectedIndex];

    if (!selectedService) {
      return {
        handled: true,
        state: "CHOOSING_SERVICE",
        context: input.metadata.context || {},
        reply: "No encontré ese servicio. Respondé con un número válido o escribí cancelar.",
      };
    }

    return {
      handled: true,
      state: "BOOKING_PENDING_HUMAN_CONFIRMATION",
      context: {
        ...(input.metadata.context || {}),
        selectedService,
      },
      reply: `Recibí tu interés por ${selectedService.name}. Puedo derivar esta solicitud para confirmación humana o integrarla luego con agenda automática.`,
    };
  }

  if (shouldStartBookingFlow(input.text, input.config)) {
    return {
      handled: true,
      state: "CHOOSING_SERVICE",
      context: {},
      reply: buildBookingStartMessage(input.config),
    };
  }

  return {
    handled: false,
    state,
    context: input.metadata.context || {},
    reply: "",
  };
}
