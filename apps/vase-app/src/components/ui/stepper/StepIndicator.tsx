"use client";

// Parte de stepper.tsx: stepVariants, stepHeightTransition, stepSlideTransition, Step, StepIndicator, StepConnector y más.
import { motion, type Transition, type Variants } from "motion/react";
import { type JSX, type ReactNode } from "react";
import styles from "@/components/ui/stepper.module.css";

export const stepVariants: Variants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? "-8%" : "8%",
    opacity: 0,
    filter: "blur(4px)",
  }),
  center: {
    x: "0%",
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? "6%" : "-6%",
    opacity: 0,
    filter: "blur(3px)",
  }),
};

export const stepHeightTransition: Transition = {
  type: "spring",
  duration: 0.4,
};

export const stepSlideTransition: Transition = {
  duration: 0.35,
};

export function Step({ children }: { children: ReactNode }): JSX.Element {
  return <div className={styles.stepDefault}>{children}</div>;
}

export function StepIndicator({
  step,
  currentStep,
  onClickStep,
  disableStepIndicators,
}: {
  step: number;
  currentStep: number;
  onClickStep: (step: number) => void;
  disableStepIndicators?: boolean;
}) {
  const status =
    currentStep === step ? "active" : currentStep < step ? "inactive" : "complete";

  return (
    <motion.button
      type="button"
      onClick={() => {
        if (step !== currentStep && !disableStepIndicators) {
          onClickStep(step);
        }
      }}
      className={styles.stepIndicator}
      animate={status}
      initial={false}
      disabled={disableStepIndicators}
    >
      <motion.div
        className={styles.stepIndicatorInner}
        variants={{
          inactive: {
            scale: 1,
            backgroundColor: "rgba(187, 202, 190, 0.18)",
            color: "#6c7b70",
          },
          active: {
            scale: 1.02,
            backgroundColor: "#18c37e",
            color: "#18c37e",
          },
          complete: {
            scale: 1,
            backgroundColor: "#006d43",
            color: "#006d43",
          },
        }}
        transition={{ duration: 0.2 }}
      >
        {status === "complete" ? (
          <CheckIcon className={styles.checkIcon} />
        ) : status === "active" ? (
          <span className={styles.activeDot} />
        ) : (
          <span className={styles.stepNumber}>{step}</span>
        )}
      </motion.div>
    </motion.button>
  );
}

export function StepConnector({ isComplete }: { isComplete: boolean }) {
  const lineVariants: Variants = {
    incomplete: { width: 0, backgroundColor: "transparent" },
    complete: { width: "100%", backgroundColor: "#18c37e" },
  };

  return (
    <div className={styles.stepConnector}>
      <motion.div
        className={styles.stepConnectorInner}
        variants={lineVariants}
        initial={false}
        animate={isComplete ? "complete" : "incomplete"}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

export function CheckIcon(props: JSX.IntrinsicElements["svg"]) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.05, type: "tween", ease: "easeOut", duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
