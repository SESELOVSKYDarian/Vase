"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { registerAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import Stepper, { Step } from "@/components/ui/stepper";
import {
  getLabsPlanDefinition,
  getOnboardingPricing,
  getRequiredProductForModules,
  labsPlans,
  onboardingModules,
  recommendModules,
  type LabsPlanId,
  type OnboardingChannelId,
  type OnboardingModuleId,
  type ProductSelection,
} from "@/lib/auth/onboarding";

const initialState: AuthActionState = {};

type MicrophonePermissionState =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported"
  | "insecure";

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

function getBrowserVoiceLabel() {
  if (typeof window === "undefined") {
    return "este navegador";
  }

  const userAgent = window.navigator.userAgent;

  if (userAgent.includes("Edg/")) {
    return "Microsoft Edge";
  }

  if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) {
    return "Google Chrome";
  }

  if (userAgent.includes("Firefox/")) {
    return "Firefox";
  }

  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
    return "Safari";
  }

  return "este navegador";
}

function mapSpeechRecognitionError(error?: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "El navegador bloqueó el micrófono. Permite el acceso al sitio y vuelve a intentar.";
    case "no-speech":
      return "No detectamos voz. Intenta nuevamente hablando más cerca del micrófono.";
    case "audio-capture":
      return "No se pudo capturar audio desde el micrófono. Revisa si otro programa lo está usando.";
    case "network":
      return "La transcripción del navegador falló por red o por el servicio de voz del navegador. Prueba en Chrome o Edge.";
    case "aborted":
      return null;
    case "language-not-supported":
      return "El navegador no soporta reconocimiento de voz para este idioma en este dispositivo.";
    default:
      return "No pudimos transcribir el audio desde el navegador. Prueba otra vez o escribe el texto.";
  }
}

const productOptions: Array<{
  value: ProductSelection;
  title: string;
  description: string;
}> = [
  {
    value: "BUSINESS",
    title: "Vase Business",
    description: "Base comercial con storefront, presencia digital y crecimiento modular.",
  },
  {
    value: "LABS",
    title: "Vase Labs",
    description: "Chatbots, automatizaciones, n8n e IA aplicada a conversaciones.",
  },
  {
    value: "BOTH",
    title: "Vase Business + Vase Labs",
    description: "Combina negocio, integraciones y automatizacion en una sola cuenta.",
  },
];

const channelOptions: Array<{
  value: OnboardingChannelId;
  title: string;
  description: string;
}> = [
  {
    value: "webchat",
    title: "Webchat",
    description: "Chat embebido dentro del sitio.",
  },
  {
    value: "whatsapp",
    title: "WhatsApp",
    description: "Atencion comercial o soporte directo.",
  },
  {
    value: "instagram",
    title: "Instagram",
    description: "DMs y consultas sociales.",
  },
  {
    value: "facebook",
    title: "Facebook",
    description: "Canal contemplado para futuras automatizaciones Meta.",
  },
];

function toggleItem<T extends string>(items: T[], item: T) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

function getFieldError(state: AuthActionState, field: string, fallback?: string) {
  return state.fieldErrors?.[field]?.[0] ?? fallback;
}

function getDefaultModulesForProduct(
  productSelection: ProductSelection,
  channels: OnboardingChannelId[],
): OnboardingModuleId[] {
  void channels;
  if (productSelection === "BOTH") {
    return ["business_core"];
  }

  return ["business_core"];
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  const [currentStep, setCurrentStep] = useState(1);
  const [productSelection, setProductSelection] = useState<ProductSelection>("BUSINESS");
  const [businessGoal, setBusinessGoal] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<OnboardingChannelId[]>(["webchat"]);
  const [selectedModules, setSelectedModules] = useState<OnboardingModuleId[]>(["business_core"]);
  const [selectedLabsPlan, setSelectedLabsPlan] = useState<LabsPlanId | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hasCustomizedModules, setHasCustomizedModules] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [microphonePermission, setMicrophonePermission] =
    useState<MicrophonePermissionState>("unknown");
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const browserVoiceLabel = useMemo(() => getBrowserVoiceLabel(), []);

  const recommendation = useMemo(
    () =>
      recommendModules({
        goal: businessGoal,
        preferredProduct: productSelection,
        channels: selectedChannels,
      }),
    [businessGoal, productSelection, selectedChannels],
  );

  const suggestedModules = recommendation.recommendedModules.length
    ? recommendation.recommendedModules
    : getDefaultModulesForProduct(productSelection, selectedChannels);
  const suggestedLabsPlan = recommendation.recommendedLabsPlan;

  const selectedModuleSet = useMemo(() => new Set(selectedModules), [selectedModules]);
  const suggestedModuleSet = useMemo(() => new Set(suggestedModules), [suggestedModules]);

  const derivedProductSelection = hasCustomizedModules
    ? getRequiredProductForModules(selectedModules, selectedLabsPlan)
    : recommendation.recommendedProduct;
  const effectiveSelectedModules = hasCustomizedModules
    ? selectedModules
    : derivedProductSelection === "LABS"
      ? []
      : suggestedModules;
  const effectiveSelectedLabsPlan = hasCustomizedModules ? selectedLabsPlan : suggestedLabsPlan;

  const pricing = getOnboardingPricing(
    effectiveSelectedModules,
    derivedProductSelection,
    effectiveSelectedLabsPlan,
  );
  const currentLabsPlan = getLabsPlanDefinition(effectiveSelectedLabsPlan);
  const showsBusinessConfiguration =
    derivedProductSelection === "BUSINESS" || derivedProductSelection === "BOTH";
  const showsLabsPlan =
    derivedProductSelection === "LABS" || derivedProductSelection === "BOTH";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      queueMicrotask(() => setMicrophonePermission("insecure"));
      return;
    }

    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi || !navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setMicrophonePermission("unsupported"));
      return;
    }

    if (!navigator.permissions?.query) {
      queueMicrotask(() => setMicrophonePermission("prompt"));
      return;
    }

    let isMounted = true;

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (!isMounted) {
          return;
        }

        setMicrophonePermission(status.state as MicrophonePermissionState);
        status.onchange = () => {
          setMicrophonePermission(status.state as MicrophonePermissionState);
        };
      })
      .catch(() => {
        if (isMounted) {
          setMicrophonePermission("prompt");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.stop();
    };
  }, []);

  const toggleChannel = (channel: OnboardingChannelId) => {
    setSelectedChannels((current) => toggleItem(current, channel));
  };

  const toggleModule = (moduleId: OnboardingModuleId) => {
    setHasCustomizedModules(true);
    setSelectedModules((current) => {
      const nextSelection = toggleItem(current, moduleId);
      return nextSelection.length === 0 ? current : nextSelection;
    });
  };

  const applySuggestedModules = () => {
    setHasCustomizedModules(true);
    setSelectedModules(suggestedModules);
    setSelectedLabsPlan(suggestedLabsPlan);
  };

  const requestMicrophonePermission = async () => {
    if (typeof window === "undefined") {
      return false;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setMicrophonePermission("insecure");
      setAudioError("Para usar el micrófono necesitas abrir Vase en HTTPS o en localhost.");
      return false;
    }

    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi || !navigator.mediaDevices?.getUserMedia) {
      setMicrophonePermission("unsupported");
      setAudioError("Tu navegador no soporta transcripción por voz dentro de este formulario.");
      return false;
    }

    try {
      setAudioError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophonePermission("granted");
      return true;
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : "";

      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setMicrophonePermission("denied");
        setAudioError("El navegador bloqueó el micrófono. Permite el acceso al sitio y vuelve a intentar.");
      } else {
        setMicrophonePermission("prompt");
        setAudioError("No pudimos pedir permiso al micrófono. Intenta nuevamente.");
      }

      return false;
    }
  };


  const startAudioRecording = async () => {
    if (microphonePermission !== "granted") {
      const granted = await requestMicrophonePermission();

      if (!granted) {
        return;
      }
    }

    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi || !navigator.mediaDevices?.getUserMedia) {
      setAudioError(
        "Tu navegador no soporta transcripción gratuita desde el navegador. Puedes escribir tu idea manualmente.",
      );
      return;
    }

    try {
      setAudioError(null);
      const recognition = new SpeechRecognitionApi();
      let finalTranscript = "";

      recognition.lang = "es-AR";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let mergedTranscript = finalTranscript;

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript?.trim();

          if (!transcript) {
            continue;
          }

          if (result.isFinal) {
            finalTranscript = `${finalTranscript} ${transcript}`.trim();
            mergedTranscript = finalTranscript;
          } else {
            mergedTranscript = `${finalTranscript} ${transcript}`.trim();
          }
        }

        if (mergedTranscript) {
          setBusinessGoal(mergedTranscript);
        }
      };
      recognition.onerror = (event) => {
        setIsRecordingAudio(false);
        setIsTranscribingAudio(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMicrophonePermission("denied");
        }

        const nextError = mapSpeechRecognitionError(event.error);
        if (nextError) {
          setAudioError(nextError);
        }
      };
      recognition.onend = () => {
        setIsRecordingAudio(false);
        setIsTranscribingAudio(false);
      };

      speechRecognitionRef.current = recognition;
      setIsRecordingAudio(true);
      setIsTranscribingAudio(true);
      setMicrophonePermission("granted");
      recognition.start();
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : "";

      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setMicrophonePermission("denied");
        setAudioError("El navegador bloqueó el micrófono. Permite el acceso al sitio y vuelve a intentar.");
      } else {
        setAudioError("No pudimos acceder al micrófono. Revisa permisos e intenta nuevamente.");
      }
    }
  };

  const stopAudioRecording = () => {
    if (!speechRecognitionRef.current) {
      return;
    }

    setIsRecordingAudio(false);
    setIsTranscribingAudio(false);
    speechRecognitionRef.current.stop();
    speechRecognitionRef.current = null;
  };

  const isStepOneValid = productSelection.length > 0;
  const isStepTwoValid = businessGoal.trim().length >= 12 && industry.trim().length >= 2;
  const isStepThreeValid =
    derivedProductSelection === "LABS"
      ? Boolean(effectiveSelectedLabsPlan)
      : derivedProductSelection === "BOTH"
        ? effectiveSelectedModules.length > 0 && Boolean(effectiveSelectedLabsPlan)
        : effectiveSelectedModules.length > 0;
  const fields = state.fieldErrors ?? {};
  const errorStep =
    fields.productSelection || fields.selectedChannels
      ? 1
      : fields.businessGoal || fields.industry
        ? 2
        : fields.selectedModules || fields.recommendationSummary
          ? 3
          : fields.businessName ||
              fields.accountName ||
              fields.name ||
              fields.email ||
              fields.password
            ? 4
            : undefined;
  const activeStep = errorStep ?? currentStep;

  return (
    <form action={formAction} className="mt-8 space-y-5" aria-label="Formulario de registro">
      <input type="hidden" name="productSelection" value={derivedProductSelection} />
      <input type="hidden" name="businessGoal" value={businessGoal} />
      <input type="hidden" name="industry" value={industry} />
      <input type="hidden" name="selectedModules" value={JSON.stringify(effectiveSelectedModules)} />
      <input type="hidden" name="selectedChannels" value={JSON.stringify(selectedChannels)} />
      <input type="hidden" name="recommendationSummary" value={recommendation.summary} />
      <input type="hidden" name="monthlyEstimate" value={String(pricing.monthlyTotal)} />
      <input type="hidden" name="setupEstimate" value={String(pricing.setupTotal)} />

      <AuthNotice kind="error" message={state.error} />
      <AuthNotice
        kind="info"
        message="Vase Business se configura por base y extras. Vase Labs se define por planes. Primero eliges la base, luego cuentas tu necesidad y al final ajustas la propuesta."
      />

      <Stepper
        initialStep={1}
        currentStep={activeStep}
        onStepChange={setCurrentStep}
        backButtonText="Anterior"
        nextButtonText="Siguiente"
        completeButtonText="Crear cuenta"
        isNextDisabled={
          (activeStep === 1 && !isStepOneValid) ||
          (activeStep === 2 && !isStepTwoValid) ||
          (activeStep === 3 && !isStepThreeValid) ||
          isRecordingAudio ||
          isTranscribingAudio
        }
        nextButtonProps={{
          formNoValidate: activeStep !== 4,
        }}
        stepCircleContainerClassName="rounded-[2rem] border border-[#dbe7dd] bg-[#fcfdfc] p-4 shadow-[0_20px_45px_rgba(25,28,27,0.06)]"
        stepContainerClassName="mb-8"
        contentClassName="min-h-[31rem] md:min-h-[28rem]"
        renderStepIndicator={({ step, currentStep: stepCurrent, onStepClick }) => (
          <button
            type="button"
            onClick={() => onStepClick(step)}
            className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold transition ${
              stepCurrent === step
                ? "border-[#18c37e] bg-[#18c37e] text-white"
                : stepCurrent > step
                  ? "border-[#006d43] bg-[#006d43] text-white"
                  : "border-[#d6e0d8] bg-white text-[#6c7b70]"
            }`}
          >
            {step}
          </button>
        )}
      >
        <Step>
          <div className="space-y-6 px-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#6c7b70]">Paso 1</p>
              <h3 className="mt-2 font-[family-name:var(--font-newsreader)] text-3xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                Elegi la base y los canales
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#3c4a40]">
                Primero definimos si arrancas con Business, Labs o ambos, y por que canales vas a conversar o vender.
              </p>
            </div>

            <div className="grid gap-3">
              {productOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProductSelection(option.value)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    productSelection === option.value
                      ? "border-[#18c37e]/40 bg-[#18c37e]/10"
                      : "border-[#dbe7dd] bg-white"
                  }`}
                >
                  <p className="font-semibold text-[#191c1b]">{option.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#3c4a40]">{option.description}</p>
                </button>
              ))}
            </div>
            <FieldError message={getFieldError(state, "productSelection")} />

            <div className="space-y-3">
              <p className="text-sm font-medium text-[#191c1b]">Canales que quieres activar</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {channelOptions.map((channel) => {
                  const active = selectedChannels.includes(channel.value);

                  return (
                    <button
                      key={channel.value}
                      type="button"
                      onClick={() => toggleChannel(channel.value)}
                      className={`rounded-3xl border p-4 text-left transition ${
                        active ? "border-[#18c37e]/40 bg-[#18c37e]/10" : "border-[#dbe7dd] bg-white"
                      }`}
                    >
                      <p className="font-semibold text-[#191c1b]">{channel.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#3c4a40]">{channel.description}</p>
                    </button>
                  );
                })}
              </div>
              <FieldError message={getFieldError(state, "selectedChannels")} />
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-6 px-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#6c7b70]">Paso 2</p>
              <h3 className="mt-2 font-[family-name:var(--font-newsreader)] text-3xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                Contanos lo que necesitas
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#3c4a40]">
                Describe si quieres una web, ecommerce, integrar tu sistema de gestion, agregar chatbot web, WhatsApp u otras automatizaciones. Puedes escribir o grabar audio.
              </p>
            </div>

            <div className="space-y-2">
              <label className="ml-1 block text-xs uppercase tracking-[0.18em] text-[#6c7b70]" htmlFor="businessGoal">
                Objetivo del sistema
              </label>
              <textarea
                id="businessGoal"
                value={businessGoal}
                onChange={(event) => setBusinessGoal(event.target.value)}
                rows={6}
                placeholder="Ejemplo: quiero tener una web con ecommerce, conectar mi sistema de gestion, sumar un chatbot en la pagina y responder por WhatsApp."
                className="min-h-40 w-full rounded-3xl border border-[#dbe7dd] bg-white px-5 py-4 text-[#191c1b] outline-none transition focus:ring-2 focus:ring-[#18c37e]/25"
              />
              <FieldError message={getFieldError(state, "businessGoal")} />
            </div>

            <div className="rounded-[1.6rem] border border-[#e6efe8] bg-[linear-gradient(180deg,#f6fbf7_0%,#eef7f1_100%)] p-5">
              <div className="flex flex-wrap items-center gap-3">
                {microphonePermission !== "granted" ? (
                  <button
                    type="button"
                    onClick={requestMicrophonePermission}
                    disabled={isRecordingAudio || isTranscribingAudio}
                    className="rounded-full border border-[#006d43] bg-white px-4 py-2 text-sm font-semibold text-[#006d43] transition hover:bg-[#eef7f1] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Solicitar permiso del micrófono
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                  disabled={
                    isTranscribingAudio ||
                    microphonePermission === "unsupported" ||
                    microphonePermission === "insecure"
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isRecordingAudio
                      ? "bg-[#8b1e3f] text-white hover:bg-[#751735]"
                      : "border border-[#006d43] text-[#006d43] hover:bg-[#eef7f1]"
                  } ${!isRecordingAudio ? "bg-white" : ""}`}
                >
                  {isRecordingAudio ? "Detener grabacion" : "Grabar audio"}
                </button>

                {isTranscribingAudio ? (
                  <span className="text-sm text-[#3c4a40]">Transcribiendo audio...</span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-7 text-[#3c4a40]">
                Puedes tocar grabar, contar tu idea en voz alta y el navegador la transcribe gratis dentro del campo de objetivo.
              </p>

              <p className="mt-2 text-sm text-[#3c4a40]">
                Esta transcripción gratis depende del reconocimiento de voz del navegador. Navegador detectado: {browserVoiceLabel}. Funciona mejor en Chrome o Edge.
              </p>

              {microphonePermission === "prompt" || microphonePermission === "unknown" ? (
                <p className="mt-2 text-sm text-[#3c4a40]">
                  Toca <strong>Solicitar permiso del micrófono</strong> y el navegador debería mostrar el pedido de acceso.
                </p>
              ) : null}

              {microphonePermission === "denied" ? (
                <p className="mt-2 text-sm text-[#8b1e3f]">
                  El permiso ya quedó bloqueado por el navegador. Cuando eso pasa, la web no puede volver a forzar el popup: hay que habilitarlo desde el icono del sitio en la barra de direcciones y luego volver a intentar.
                </p>
              ) : null}

              {microphonePermission === "insecure" ? (
                <p className="mt-2 text-sm text-[#8b1e3f]">
                  El micrófono solo funciona en HTTPS o localhost.
                </p>
              ) : null}

              {microphonePermission === "unsupported" ? (
                <p className="mt-2 text-sm text-[#8b1e3f]">
                  Este navegador no soporta transcripción por voz en este formulario.
                </p>
              ) : null}

              {audioError ? <p className="mt-3 text-sm text-[#8b1e3f]">{audioError}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="ml-1 block text-xs uppercase tracking-[0.18em] text-[#6c7b70]" htmlFor="industry">
                Rubro o industria
              </label>
              <input
                id="industry"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                className="min-h-14 w-full rounded-xl border border-[#dbe7dd] bg-white px-4 text-[#191c1b] outline-none transition focus:ring-2 focus:ring-[#18c37e]/25"
                placeholder="Moda, gastronomia, salud, retail, servicios..."
              />
              <FieldError message={getFieldError(state, "industry")} />
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-6 px-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#6c7b70]">Paso 3</p>
              <h3 className="mt-2 font-[family-name:var(--font-newsreader)] text-3xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                Propuesta sugerida para arrancar
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#3c4a40]">
                En base a la base elegida, los canales y lo que describiste, te mostramos la configuracion de Business y el plan de Labs que mas sentido tienen para empezar.
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-[#e6efe8] bg-[linear-gradient(180deg,#f6fbf7_0%,#eef7f1_100%)] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#006d43]">Sugerencia actual</p>
              <p className="mt-3 text-sm leading-7 text-[#3c4a40]">{recommendation.summary}</p>
              {recommendation.reasons.length > 0 ? (
                <div className="mt-4 space-y-2">
                {recommendation.reasons.map((reason) => (
                    <p key={reason} className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-[#3c4a40]">
                      {reason}
                    </p>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={applySuggestedModules}
                className="mt-4 rounded-full border border-[#006d43] bg-white px-4 py-2 text-sm font-semibold text-[#006d43] transition hover:bg-[#eef7f1]"
              >
                Aplicar sugerencia
              </button>
            </div>

            {showsBusinessConfiguration ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#191c1b]">Configuracion de Vase Business</p>
                <div className="grid gap-3">
                  {onboardingModules.map((module) => {
                    const selected = selectedModuleSet.has(module.id);
                    const recommended = suggestedModuleSet.has(module.id);

                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => toggleModule(module.id)}
                        className={`rounded-3xl border p-4 text-left transition ${
                          selected ? "border-[#18c37e]/40 bg-[#18c37e]/10" : "border-[#dbe7dd] bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#191c1b]">{module.title}</p>
                            <p className="mt-1 text-sm leading-6 text-[#3c4a40]">{module.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#191c1b]">ARS {module.setupPrice.toLocaleString("es-AR")}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#6c7b70]">
                              Implementacion
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#f2f4f2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c7b70]">
                            {module.requires === "ANY" ? "Compatible con cualquier base" : `Requiere ${module.requires}`}
                          </span>
                          {recommended ? (
                            <span className="rounded-full bg-[#006d43] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                              Recomendado
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <FieldError message={getFieldError(state, "selectedModules")} />
              </div>
            ) : null}

            {showsLabsPlan ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#191c1b]">Plan recomendado de Vase Labs</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {labsPlans.map((plan) => {
                    const active = effectiveSelectedLabsPlan === plan.id;
                    const recommended = suggestedLabsPlan === plan.id;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setHasCustomizedModules(true);
                          setSelectedLabsPlan(plan.id);
                        }}
                        className={`rounded-3xl border p-4 text-left transition ${
                          active ? "border-[#18c37e]/40 bg-[#18c37e]/10" : "border-[#dbe7dd] bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#191c1b]">{plan.title}</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#006d43]">
                              {plan.optionLabel}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[#3c4a40]">{plan.description}</p>
                          </div>
                          {recommended ? (
                            <span className="rounded-full bg-[#006d43] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                              Sugerido
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-4 text-lg font-semibold text-[#191c1b]">
                          ARS {plan.monthlyPrice.toLocaleString("es-AR")} / mes
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {derivedProductSelection !== productSelection ? (
              <AuthNotice
                kind="info"
                message={`Por la configuracion elegida, la cuenta se configurara como ${derivedProductSelection}.`}
              />
            ) : null}

            <div className="grid gap-4 rounded-[1.6rem] border border-[#dbe7dd] bg-[#f7faf8] p-5 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#6c7b70]">Resumen de compra</p>
                <p className="mt-2 text-sm leading-7 text-[#3c4a40]">
                  Base final: {derivedProductSelection}. Configuracion Business: {effectiveSelectedModules.length}. Plan Labs: {currentLabsPlan?.title ?? "Sin plan de Labs"}.
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#6c7b70]">Estimado inicial</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                  ARS {pricing.monthlyTotal.toLocaleString("es-AR")}
                  <span className="ml-2 text-base font-medium text-[#6c7b70]">/ mes Labs</span>
                </p>
                <p className="mt-2 text-sm text-[#3c4a40]">Implementacion Business: ARS {pricing.setupTotal.toLocaleString("es-AR")}</p>
              </div>
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-6 px-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#6c7b70]">Paso 4</p>
              <h3 className="mt-2 font-[family-name:var(--font-newsreader)] text-3xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                Creamos tu cuenta
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#3c4a40]">
                Confirma tus datos y dejamos listo tu tenant con los modulos elegidos.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 block text-xs uppercase tracking-[0.18em] text-[#6c7b70]" htmlFor="businessName">
                  Nombre del negocio
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  className="min-h-14 w-full rounded-xl border border-[#dbe7dd] bg-white px-4 text-[#191c1b] outline-none transition focus:ring-2 focus:ring-[#18c37e]/25"
                />
                <FieldError message={getFieldError(state, "businessName")} />
              </div>

              <div className="space-y-2">
                <label className="ml-1 block text-xs uppercase tracking-[0.18em] text-[#6c7b70]" htmlFor="accountName">
                  Nombre de cuenta
                </label>
                <input
                  id="accountName"
                  name="accountName"
                  type="text"
                  required
                  className="min-h-14 w-full rounded-xl border border-[#dbe7dd] bg-white px-4 text-[#191c1b] outline-none transition focus:ring-2 focus:ring-[#18c37e]/25"
                />
                <FieldError message={getFieldError(state, "accountName")} />
              </div>

              <div className="space-y-2">
                <label className="ml-1 block text-xs uppercase tracking-[0.18em] text-[#6c7b70]" htmlFor="name">
                  Tu nombre
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="min-h-14 w-full rounded-xl border border-[#dbe7dd] bg-white px-4 text-[#191c1b] outline-none transition focus:ring-2 focus:ring-[#18c37e]/25"
                />
                <FieldError message={getFieldError(state, "name")} />
              </div>

              <div className="space-y-2">
                <label className="ml-1 block text-xs uppercase tracking-[0.18em] text-[#6c7b70]" htmlFor="email">
                  Email de trabajo
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="min-h-14 w-full rounded-xl border border-[#dbe7dd] bg-white px-4 text-[#191c1b] outline-none transition focus:ring-2 focus:ring-[#18c37e]/25"
                />
                <FieldError message={getFieldError(state, "email")} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <label className="ml-1 block text-xs uppercase tracking-[0.18em] text-[#6c7b70]" htmlFor="password">
                    Contrasena
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={12}
                    className="min-h-14 w-full rounded-xl border border-[#dbe7dd] bg-white px-4 pr-14 text-[#191c1b] outline-none transition focus:ring-2 focus:ring-[#18c37e]/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showPassword}
                    className="absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-[#006d43] transition hover:bg-[#eef7f1] hover:text-[#004a2c]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-sm text-[#6c7b70]">
                  Usa al menos 12 caracteres con mayuscula, minuscula, numero y simbolo.
                </p>
                <FieldError message={getFieldError(state, "password")} />
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-[#e6efe8] bg-[#f7faf8] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#6c7b70]">Lo que se va a crear</p>
              <div className="mt-3 grid gap-2 text-sm text-[#3c4a40]">
                <p>Base elegida: <strong>{derivedProductSelection}</strong></p>
                <p>Configuracion Business: <strong>{effectiveSelectedModules.length}</strong></p>
                <p>Plan Labs: <strong>{currentLabsPlan?.title ?? "Sin plan de Labs"}</strong></p>
                <p>Canales: <strong>{selectedChannels.length === 0 ? "Sin canales por ahora" : selectedChannels.join(", ")}</strong></p>
                <p>Estimado mensual Labs: <strong>ARS {pricing.monthlyTotal.toLocaleString("es-AR")}</strong></p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-[#dbe7dd] bg-white p-4 transition-colors hover:border-[#18c37e]/40">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                required
                className="mt-1 h-5 w-5 rounded border-[#dbe7dd] text-[#18c37e] focus:ring-[#18c37e]/25"
              />
              <label htmlFor="acceptTerms" className="text-sm leading-6 text-[#3c4a40]">
                He leído y acepto los{" "}
                <Link href={"/terminos-y-condiciones" as any} className="font-bold text-[#006d43] hover:underline" target="_blank">
                  términos y condiciones
                </Link>{" "}
                y las{" "}
                <Link href={"/politica-de-privacidad" as any} className="font-bold text-[#006d43] hover:underline" target="_blank">
                  políticas de seguridad
                </Link>
                .
              </label>
            </div>
            <FieldError message={getFieldError(state, "acceptTerms")} />

            <AuthNotice
              kind="info"
              message="Al crear la cuenta se genera tu tenant, se asigna el rol owner y se envia un email de verificacion."
            />
          </div>
        </Step>
      </Stepper>
    </form>
  );
}
