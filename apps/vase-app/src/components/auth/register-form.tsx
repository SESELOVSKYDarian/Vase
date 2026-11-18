"use client";

import { Check, Eye, EyeOff, Mic, Sparkles, Square } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type ReactNode, useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { registerAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { authChoice, authHint, authInput, authLabel, authLink, authPanel, authSecondaryButton, authTextarea } from "@/components/auth/auth-ui";
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
    description: "Tu tienda online, con catálogo, pedidos y clientes.",
  },
  {
    value: "LABS",
    title: "Vase Labs",
    description: "Un asistente que responde a tus clientes por WhatsApp, Instagram y tu web.",
  },
  {
    value: "BOTH",
    title: "Los dos",
    description: "Tienda y asistente juntos, con los mismos productos y clientes.",
  },
];

const channelOptions: Array<{
  value: OnboardingChannelId;
  title: string;
  description: string;
}> = [
  {
    value: "webchat",
    title: "Tu web",
    description: "Un chat en tu página.",
  },
  {
    value: "whatsapp",
    title: "WhatsApp",
    description: "Consultas y ventas.",
  },
  {
    value: "instagram",
    title: "Instagram",
    description: "Mensajes directos.",
  },
  {
    value: "facebook",
    title: "Facebook",
    description: "Messenger.",
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

  const micUnavailable = microphonePermission === "unsupported" || microphonePermission === "insecure";
  const stepLabels = ["Producto", "Tu negocio", "Propuesta", "Tus datos"];

  return (
    <form action={formAction} className="space-y-5" aria-label="Formulario de registro">
      <input type="hidden" name="productSelection" value={derivedProductSelection} />
      <input type="hidden" name="businessGoal" value={businessGoal} />
      <input type="hidden" name="industry" value={industry} />
      <input type="hidden" name="selectedModules" value={JSON.stringify(effectiveSelectedModules)} />
      <input type="hidden" name="selectedChannels" value={JSON.stringify(selectedChannels)} />
      <input type="hidden" name="recommendationSummary" value={recommendation.summary} />
      <input type="hidden" name="monthlyEstimate" value={String(pricing.monthlyTotal)} />
      <input type="hidden" name="setupEstimate" value={String(pricing.setupTotal)} />

      <AuthNotice kind="error" message={state.error} />

      <Stepper
        initialStep={1}
        currentStep={activeStep}
        onStepChange={setCurrentStep}
        backButtonText="Atrás"
        nextButtonText="Seguir"
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
        stepCircleContainerClassName="rounded-3xl border border-[#e3e9e5] bg-white p-5 shadow-[0_1px_2px_rgba(25,28,27,0.04),0_24px_48px_-24px_rgba(25,28,27,0.12)] sm:p-7"
        stepContainerClassName="mb-7"
        renderStepIndicator={({ step, currentStep: stepCurrent, onStepClick }) => (
          <button
            type="button"
            onClick={() => onStepClick(step)}
            aria-current={stepCurrent === step ? "step" : undefined}
            aria-label={`Paso ${step}: ${stepLabels[step - 1]}`}
            className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3B633D]/15"
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold transition ${
                stepCurrent === step
                  ? "bg-[#3B633D] text-white shadow-[0_0_0_4px_rgba(59,99,61,0.14)]"
                  : stepCurrent > step
                    ? "bg-[#dbe9dc] text-[#2f5a35]"
                    : "border border-[#dfe6e1] bg-white text-[#8a958e]"
              }`}
            >
              {stepCurrent > step ? <Check size={15} strokeWidth={2.5} aria-hidden="true" /> : step}
            </span>
            <span
              className={`hidden text-[13px] font-medium md:inline ${stepCurrent === step ? "text-[#191c1b]" : "text-[#8a958e]"}`}
            >
              {stepLabels[step - 1]}
            </span>
          </button>
        )}
      >
        <Step>
          <div className="space-y-6">
            <StepTitle step={1} title="¿Con qué querés empezar?" description="Podés sumar el otro producto cuando quieras." />

            <div className="grid gap-3">
              {productOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProductSelection(option.value)}
                  aria-pressed={productSelection === option.value}
                  className={authChoice(productSelection === option.value)}
                >
                  <span className="flex items-start gap-3">
                    <ChoiceDot active={productSelection === option.value} />
                    <span>
                      <b className="block font-semibold text-[#191c1b]">{option.title}</b>
                      <span className="mt-1 block text-sm leading-6 text-[#5b6660]">{option.description}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <FieldError message={getFieldError(state, "productSelection")} />

            <div className="space-y-3">
              <p className={authLabel}>¿Por dónde te escriben tus clientes?</p>
              <div className="grid grid-cols-2 gap-2.5">
                {channelOptions.map((channel) => {
                  const active = selectedChannels.includes(channel.value);

                  return (
                    <button
                      key={channel.value}
                      type="button"
                      onClick={() => toggleChannel(channel.value)}
                      aria-pressed={active}
                      className={`${authChoice(active)} !p-3.5`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <b className="text-sm font-semibold text-[#191c1b]">{channel.title}</b>
                        <ChoiceCheck active={active} />
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#66736b]">{channel.description}</span>
                    </button>
                  );
                })}
              </div>
              <FieldError message={getFieldError(state, "selectedChannels")} />
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-6">
            <StepTitle
              step={2}
              title="Contanos de tu negocio"
              description="Qué vendés y qué te gustaría resolver. Con eso te armamos una propuesta."
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className={authLabel} htmlFor="businessGoal">
                  ¿Qué necesitás?
                </label>
                <button
                  type="button"
                  onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                  disabled={micUnavailable}
                  title={micUnavailable ? "Tu navegador no permite dictar en este formulario" : undefined}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isRecordingAudio
                      ? "bg-[#8b1e3f] text-white hover:bg-[#751735]"
                      : "border border-[#d9e1db] bg-white text-[#2b322e] hover:bg-[#f7f9f7]"
                  }`}
                >
                  {isRecordingAudio ? <Square size={13} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
                  {isRecordingAudio ? "Detener" : "Dictar"}
                </button>
              </div>
              <textarea
                id="businessGoal"
                value={businessGoal}
                onChange={(event) => setBusinessGoal(event.target.value)}
                rows={5}
                placeholder="Ej: quiero vender online, conectar mi sistema de gestión y responder por WhatsApp."
                className={authTextarea}
              />
              {isTranscribingAudio ? (
                <p className="flex items-center gap-2 text-sm text-[#2f5a35]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#8b1e3f]" aria-hidden="true" />
                  Te escuchamos… hablá tranquilo, el texto aparece arriba.
                </p>
              ) : (
                <p className={authHint}>
                  {micUnavailable
                    ? "Escribilo con tus palabras, no hace falta que sea perfecto."
                    : `Podés escribirlo o tocar Dictar y contarlo en voz alta (funciona mejor en Chrome o Edge; estás en ${browserVoiceLabel}).`}
                </p>
              )}
              {microphonePermission === "denied" ? (
                <p className="text-sm leading-6 text-[#8b1e3f]">
                  El micrófono está bloqueado. Habilitalo desde el candado de la barra de direcciones y probá de nuevo.
                </p>
              ) : null}
              {audioError && microphonePermission !== "denied" ? <p className="text-sm leading-6 text-[#8b1e3f]">{audioError}</p> : null}
              <FieldError message={getFieldError(state, "businessGoal")} />
            </div>

            <div className="space-y-2">
              <label className={authLabel} htmlFor="industry">
                Rubro
              </label>
              <input
                id="industry"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                className={authInput}
                placeholder="Ferretería, ropa, gastronomía, salud…"
              />
              <FieldError message={getFieldError(state, "industry")} />
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-6">
            <StepTitle step={3} title="Tu propuesta para arrancar" description="La armamos con lo que nos contaste. Podés cambiar lo que quieras." />

            <div className="rounded-2xl border border-[#cfe2d1] bg-[#f3faf4] p-4 sm:p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2f5a35]">
                <Sparkles size={14} aria-hidden="true" />
                Te sugerimos
              </p>
              <p className="mt-2 text-sm leading-6 text-[#2b322e]">{recommendation.summary}</p>
              {recommendation.reasons.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {recommendation.reasons.map((reason) => (
                    <li key={reason} className="flex gap-2 text-sm leading-6 text-[#4f5c55]">
                      <Check size={15} className="mt-1 shrink-0 text-[#3B633D]" aria-hidden="true" />
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : null}
              <button type="button" onClick={applySuggestedModules} className={`${authSecondaryButton} mt-4 min-h-10`}>
                Usar esta sugerencia
              </button>
            </div>

            {showsBusinessConfiguration ? (
              <div className="space-y-3">
                <p className={authLabel}>Vase Business</p>
                <div className="grid gap-2.5">
                  {onboardingModules.map((module) => {
                    const selected = selectedModuleSet.has(module.id);
                    const recommended = suggestedModuleSet.has(module.id);

                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => toggleModule(module.id)}
                        aria-pressed={selected}
                        className={authChoice(selected)}
                      >
                        <span className="flex items-start gap-3">
                          <ChoiceCheck active={selected} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <b className="font-semibold text-[#191c1b]">{module.title}</b>
                              {recommended ? <Badge>Recomendado</Badge> : null}
                            </span>
                            <span className="mt-1 block text-sm leading-6 text-[#5b6660]">{module.description}</span>
                            <span className="mt-2 block text-[13px] text-[#66736b]">
                              Implementación <b className="font-semibold text-[#191c1b]">ARS {module.setupPrice.toLocaleString("es-AR")}</b>
                              {module.requires === "ANY" ? null : ` · requiere ${module.requires}`}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FieldError message={getFieldError(state, "selectedModules")} />
              </div>
            ) : null}

            {showsLabsPlan ? (
              <div className="space-y-3">
                <p className={authLabel}>Plan de Vase Labs</p>
                <div className="grid gap-2.5">
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
                        aria-pressed={active}
                        className={authChoice(active)}
                      >
                        <span className="flex items-start gap-3">
                          <ChoiceDot active={active} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <b className="font-semibold text-[#191c1b]">{plan.title}</b>
                              {recommended ? <Badge>Sugerido</Badge> : null}
                            </span>
                            <span className="mt-1 block text-sm leading-6 text-[#5b6660]">{plan.description}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <b className="block text-[15px] font-semibold text-[#191c1b]">ARS {plan.monthlyPrice.toLocaleString("es-AR")}</b>
                            <span className="text-xs text-[#66736b]">por mes</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {derivedProductSelection !== productSelection ? (
              <AuthNotice kind="info" message={`Con lo que elegiste, tu cuenta arranca con ${productLabel(derivedProductSelection)}.`} />
            ) : null}

            <Summary
              rows={[
                ["Productos", productLabel(derivedProductSelection)],
                ["Plan de Labs", currentLabsPlan?.title ?? "Sin Labs por ahora"],
                ["Implementación Business", `ARS ${pricing.setupTotal.toLocaleString("es-AR")}`],
              ]}
              total={`ARS ${pricing.monthlyTotal.toLocaleString("es-AR")}`}
            />
          </div>
        </Step>

        <Step>
          <div className="space-y-6">
            <StepTitle step={4} title="Último paso: tus datos" description="Con esto creamos tu cuenta y te mandamos un correo para confirmarla." />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="businessName" label="Nombre del negocio" error={getFieldError(state, "businessName")}>
                <input id="businessName" name="businessName" type="text" required autoComplete="organization" className={authInput} />
              </Field>
              <Field id="accountName" label="Nombre de la cuenta" error={getFieldError(state, "accountName")}>
                <input id="accountName" name="accountName" type="text" required className={authInput} />
              </Field>
              <Field id="name" label="Tu nombre" error={getFieldError(state, "name")}>
                <input id="name" name="name" type="text" required autoComplete="name" className={authInput} />
              </Field>
              <Field id="email" label="Correo" error={getFieldError(state, "email")}>
                <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required className={authInput} />
              </Field>

              <div className="space-y-2 sm:col-span-2">
                <label className={authLabel} htmlFor="password">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={12}
                    aria-describedby="password-hint"
                    className={`${authInput} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#66736b] transition hover:bg-[#f1f4f2] hover:text-[#191c1b]"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
                <p id="password-hint" className={authHint}>
                  Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.
                </p>
                <FieldError message={getFieldError(state, "password")} />
              </div>
            </div>

            <Summary
              rows={[
                ["Productos", productLabel(derivedProductSelection)],
                ["Plan de Labs", currentLabsPlan?.title ?? "Sin Labs por ahora"],
                ["Canales", selectedChannels.length === 0 ? "Ninguno por ahora" : selectedChannels.map(channelLabel).join(", ")],
              ]}
              total={`ARS ${pricing.monthlyTotal.toLocaleString("es-AR")}`}
            />

            <label htmlFor="acceptTerms" className="flex cursor-pointer items-start gap-3">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                required
                className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-[#c3cec6] accent-[#3B633D]"
              />
              <span className="text-sm leading-6 text-[#4f5c55]">
                Acepto los{" "}
                <Link href={"/terminos-y-condiciones" as Route} className={authLink} target="_blank">
                  términos y condiciones
                </Link>{" "}
                y la{" "}
                <Link href={"/politica-de-privacidad" as Route} className={authLink} target="_blank">
                  política de privacidad
                </Link>
                .
              </span>
            </label>
            <FieldError message={getFieldError(state, "acceptTerms")} />
          </div>
        </Step>
      </Stepper>
    </form>
  );
}

function productLabel(product: ProductSelection) {
  return product === "BOTH" ? "Business + Labs" : product === "LABS" ? "Vase Labs" : "Vase Business";
}

function channelLabel(channel: OnboardingChannelId) {
  return channelOptions.find((option) => option.value === channel)?.title ?? channel;
}

function StepTitle({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3B633D]">Paso {step} de 4</p>
      <h2 className="mt-1.5 font-[family-name:var(--font-newsreader)] text-[1.65rem] font-medium leading-tight tracking-[-0.025em] text-[#191c1b] sm:text-3xl">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-[#5b6660]">{description}</p>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className={authLabel} htmlFor={id}>
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#3B633D] px-2 py-0.5 text-[11px] font-semibold text-white">{children}</span>
  );
}

function ChoiceDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
        active ? "border-[#3B633D] bg-[#3B633D]" : "border-[#c3cec6] bg-white"
      }`}
    >
      {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
    </span>
  );
}

function ChoiceCheck({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
        active ? "border-[#3B633D] bg-[#3B633D] text-white" : "border-[#c3cec6] bg-white text-transparent"
      }`}
    >
      <Check size={13} strokeWidth={3} />
    </span>
  );
}

function Summary({ rows, total }: { rows: Array<[string, string]>; total: string }) {
  return (
    <div className={authPanel}>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <dt className="text-[#66736b]">{label}</dt>
            <dd className="text-right font-medium text-[#191c1b]">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-end justify-between gap-4 border-t border-[#e3e9e5] pt-3">
        <span className="text-sm text-[#66736b]">Estimado por mes</span>
        <span className="text-xl font-semibold tracking-[-0.02em] text-[#191c1b]">{total}</span>
      </div>
    </div>
  );
}
