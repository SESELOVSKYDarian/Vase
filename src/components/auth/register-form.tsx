"use client";

import { useActionState, useState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { registerAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import Stepper, { Step } from "@/components/ui/stepper";
import {
  getOnboardingPricing,
  getRequiredProductForModules,
  onboardingModules,
  recommendModules,
  type OnboardingChannelId,
  type OnboardingModuleId,
  type ProductSelection,
} from "@/lib/auth/onboarding";

const initialState: AuthActionState = {};

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
    title: "Vase Full Stack",
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

function getFieldError(
  state: AuthActionState,
  field: string,
  fallback?: string,
) {
  return state.fieldErrors?.[field]?.[0] ?? fallback;
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  const [currentStep, setCurrentStep] = useState(1);
  const [productSelection, setProductSelection] = useState<ProductSelection>("BUSINESS");
  const [businessGoal, setBusinessGoal] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<OnboardingChannelId[]>(["webchat"]);
  const [selectedModules, setSelectedModules] = useState<OnboardingModuleId[]>(["business_core"]);
  const [showPassword, setShowPassword] = useState(false);

  const recommendation = recommendModules({
    goal: businessGoal,
    preferredProduct: productSelection,
    channels: selectedChannels,
  });

  const pricing = getOnboardingPricing(selectedModules);
  const requiredProduct = getRequiredProductForModules(selectedModules);
  const derivedProductSelection =
    requiredProduct === "BOTH"
      ? "BOTH"
      : productSelection === "BOTH"
        ? "BOTH"
        : requiredProduct === "LABS" && productSelection === "BUSINESS"
          ? "BOTH"
          : requiredProduct === "BUSINESS" && productSelection === "LABS"
            ? "BOTH"
            : productSelection;

  const applyRecommendation = () => {
    setProductSelection(recommendation.recommendedProduct);
    setSelectedModules(recommendation.recommendedModules);
  };

  const toggleChannel = (channel: OnboardingChannelId) => {
    setSelectedChannels((current) => toggleItem(current, channel));
  };

  const toggleModule = (moduleId: OnboardingModuleId) => {
    const selectedModuleDef = onboardingModules.find((item) => item.id === moduleId);

    if (!selectedModuleDef) {
      return;
    }

    setSelectedModules((current) => {
      const nextSelection = toggleItem(current, moduleId);
      const nextRequiredProduct = getRequiredProductForModules(nextSelection);

      if (nextSelection.length === 0) {
        return current;
      }

      if (nextRequiredProduct === "BOTH") {
        setProductSelection("BOTH");
      } else if (nextRequiredProduct === "LABS" && productSelection === "BUSINESS") {
        setProductSelection("BOTH");
      } else if (nextRequiredProduct === "BUSINESS" && productSelection === "LABS") {
        setProductSelection("BOTH");
      }

      return nextSelection;
    });
  };

  const isStepOneValid = businessGoal.trim().length >= 12 && industry.trim().length >= 2;
  const isStepTwoValid = derivedProductSelection.length > 0;
  const isStepThreeValid = selectedModules.length > 0;
  const fields = state.fieldErrors ?? {};
  const errorStep =
    fields.businessGoal || fields.industry
      ? 1
      : fields.productSelection || fields.selectedChannels
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
      <input type="hidden" name="selectedModules" value={JSON.stringify(selectedModules)} />
      <input type="hidden" name="selectedChannels" value={JSON.stringify(selectedChannels)} />
      <input type="hidden" name="recommendationSummary" value={recommendation.summary} />
      <input type="hidden" name="monthlyEstimate" value={String(pricing.monthlyTotal)} />
      <input type="hidden" name="setupEstimate" value={String(pricing.setupTotal)} />

      <AuthNotice kind="error" message={state.error} />
      <AuthNotice
        kind="info"
        message="Vase crece por modulos: arrancas con una base simple y despues activas mas capacidades segun el negocio lo necesite."
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
          (activeStep === 3 && !isStepThreeValid)
        }
        nextButtonProps={{
          formNoValidate: activeStep !== 4,
        }}
        stepCircleContainerClassName="rounded-[2rem] border border-[#dbe7dd] bg-[#fcfdfc] p-4 shadow-[0_20px_45px_rgba(25,28,27,0.06)]"
        stepContainerClassName="mb-8"
        contentClassName="min-h-[26rem]"
        renderStepIndicator={({ step, currentStep: activeStep, onStepClick }) => (
          <button
            type="button"
            onClick={() => onStepClick(step)}
            className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold transition ${
              activeStep === step
                ? "border-[#18c37e] bg-[#18c37e] text-white"
                : activeStep > step
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
                Contanos para que queres Vase
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#3c4a40]">
                Escribi el objetivo principal del negocio y el rubro. Con eso el asistente de onboarding te recomienda modulos para empezar.
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
                rows={5}
                placeholder="Ejemplo: quiero vender online, automatizar respuestas por WhatsApp y conectar stock con mi sistema de gestion."
                className="min-h-36 w-full rounded-3xl border border-[#dbe7dd] bg-white px-5 py-4 text-[#191c1b] outline-none transition focus:ring-2 focus:ring-[#18c37e]/25"
              />
              <FieldError message={getFieldError(state, "businessGoal")} />
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

            <div className="rounded-[1.6rem] border border-[#e6efe8] bg-[linear-gradient(180deg,#f6fbf7_0%,#eef7f1_100%)] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#006d43]">Asistente de onboarding</p>
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
            </div>
          </div>
        </Step>

        <Step>
          <div className="space-y-6 px-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#6c7b70]">Paso 2</p>
              <h3 className="mt-2 font-[family-name:var(--font-newsreader)] text-3xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                Elegi la base y los canales
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#3c4a40]">
                Podes seguir la recomendacion o decidir manualmente con que base arrancar.
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
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-[#191c1b]">{option.title}</p>
                    {recommendation.recommendedProduct === option.value ? (
                      <span className="rounded-full bg-[#006d43] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                        Recomendado
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#3c4a40]">{option.description}</p>
                </button>
              ))}
            </div>
            <FieldError message={getFieldError(state, "productSelection")} />

            <button
              type="button"
              onClick={applyRecommendation}
              className="rounded-full border border-[#006d43] px-4 py-2 text-sm font-semibold text-[#006d43] transition hover:bg-[#eef7f1]"
            >
              Usar recomendacion del asistente
            </button>

            <div className="space-y-3">
              <p className="text-sm font-medium text-[#191c1b]">Canales que queres activar</p>
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
              <p className="text-xs uppercase tracking-[0.24em] text-[#6c7b70]">Paso 3</p>
              <h3 className="mt-2 font-[family-name:var(--font-newsreader)] text-3xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                Elegi modulos y precio estimado
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#3c4a40]">
                Activa solo lo que realmente necesitas. Siempre vas a poder sumar mas despues.
              </p>
            </div>

            <div className="grid gap-3">
              {onboardingModules.map((module) => {
                const selected = selectedModules.includes(module.id);
                const recommended = recommendation.recommendedModules.includes(module.id);

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
                        <p className="text-sm font-semibold text-[#191c1b]">USD {module.monthlyPrice}/mes</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#6c7b70]">
                          Setup USD {module.setupPrice}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#f2f4f2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c7b70]">
                        {module.requires === "ANY" ? "Compatible con cualquier base" : `Requiere ${module.requires}`}
                      </span>
                      {recommended ? (
                        <span className="rounded-full bg-[#006d43] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                          Sugerido por el asistente
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <FieldError message={getFieldError(state, "selectedModules")} />

            {derivedProductSelection !== productSelection ? (
              <AuthNotice
                kind="info"
                message={`Por la combinacion de modulos, la cuenta se configurara como ${derivedProductSelection}.`}
              />
            ) : null}

            <div className="grid gap-4 rounded-[1.6rem] border border-[#dbe7dd] bg-[#f7faf8] p-5 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#6c7b70]">Resumen</p>
                <p className="mt-2 text-sm leading-7 text-[#3c4a40]">{recommendation.summary}</p>
              </div>
              <div className="rounded-[1.4rem] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#6c7b70]">Estimado inicial</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                  USD {pricing.monthlyTotal}
                  <span className="ml-2 text-base font-medium text-[#6c7b70]">/ mes</span>
                </p>
                <p className="mt-2 text-sm text-[#3c4a40]">Setup sugerido: USD {pricing.setupTotal}</p>
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
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="text-xs font-medium text-[#006d43] transition hover:text-[#004a2c]"
                  >
                    {showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  </button>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  className="min-h-14 w-full rounded-xl border border-[#dbe7dd] bg-white px-4 text-[#191c1b] outline-none transition focus:ring-2 focus:ring-[#18c37e]/25"
                />
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
                <p>Modulos: <strong>{selectedModules.length}</strong></p>
                <p>Canales: <strong>{selectedChannels.length === 0 ? "Sin canales por ahora" : selectedChannels.join(", ")}</strong></p>
                <p>Estimado mensual: <strong>USD {pricing.monthlyTotal}</strong></p>
              </div>
            </div>

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
