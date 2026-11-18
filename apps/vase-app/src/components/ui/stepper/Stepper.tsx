"use client";

// Parte de stepper.tsx: StepperProps, RenderStepIndicatorProps, Stepper, StepContentWrapper, SlideTransition.
import { AnimatePresence, motion } from "motion/react";
import { Children, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import styles from "@/components/ui/stepper.module.css";
import { StepConnector, StepIndicator, stepHeightTransition, stepSlideTransition, stepVariants } from "./StepIndicator";

export type StepperProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  initialStep?: number;
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  stepCircleContainerClassName?: string;
  stepContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  backButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  nextButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  backButtonText?: string;
  nextButtonText?: string;
  completeButtonText?: string;
  disableStepIndicators?: boolean;
  isNextDisabled?: boolean;
  isBackDisabled?: boolean;
  renderStepIndicator?: (props: RenderStepIndicatorProps) => ReactNode;
};

export type RenderStepIndicatorProps = {
  step: number;
  currentStep: number;
  onStepClick: (clicked: number) => void;
};

export default function Stepper({
  children,
  initialStep = 1,
  currentStep: controlledStep,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = "",
  stepContainerClassName = "",
  contentClassName = "",
  footerClassName = "",
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = "Back",
  nextButtonText = "Continue",
  completeButtonText = "Complete",
  disableStepIndicators = false,
  isNextDisabled = false,
  isBackDisabled = false,
  renderStepIndicator,
  ...rest
}: StepperProps) {
  const [uncontrolledCurrentStep, setUncontrolledCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const currentStep = controlledStep ?? uncontrolledCurrentStep;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = (newStep: number) => {
    if (typeof controlledStep !== "number") {
      setUncontrolledCurrentStep(newStep);
    }

    if (newStep > totalSteps) {
      onFinalStepCompleted();
      return;
    }

    onStepChange(newStep);
  };

  const handleBack = () => {
    if (currentStep <= 1 || isBackDisabled) {
      return;
    }

    setDirection(-1);
    updateStep(currentStep - 1);
  };

  const handleNext = () => {
    if (isNextDisabled || isCompleted) {
      return;
    }

    setDirection(1);

    if (isLastStep) {
      updateStep(totalSteps + 1);
      return;
    }

    updateStep(currentStep + 1);
  };

  const footerNavClassName =
    currentStep === 1 ? `${styles.footerNav} ${styles.footerNavEnd}` : styles.footerNav;

  return (
    <div className={styles.outerContainer} {...rest}>
      <div className={`${styles.stepCircleContainer} ${stepCircleContainerClassName}`}>
        <div className={`${styles.stepIndicatorRow} ${stepContainerClassName}`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;

            return (
              <div key={stepNumber} className={`flex items-center gap-2 ${isNotLastStep ? "flex-1" : ""}`}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: (clicked) => {
                      if (disableStepIndicators) {
                        return;
                      }

                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    currentStep={currentStep}
                    disableStepIndicators={disableStepIndicators}
                    onClickStep={(clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    }}
                  />
                )}
                {isNotLastStep ? <StepConnector isComplete={currentStep > stepNumber} /> : null}
              </div>
            );
          })}
        </div>

        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={`${styles.stepContentDefault} ${contentClassName}`}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {!isCompleted ? (
          <div className={`${styles.footerContainer} ${footerClassName}`}>
            <div className={footerNavClassName}>
              {currentStep !== 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isBackDisabled}
                  className={`${styles.buttonBase} ${styles.backButton}`}
                  {...backButtonProps}
                >
                  {backButtonText}
                </button>
              ) : null}

              <button
                type={isLastStep ? "submit" : "button"}
                onClick={isLastStep ? undefined : handleNext}
                disabled={isNextDisabled}
                className={`${styles.buttonBase} ${styles.nextButton}`}
                {...nextButtonProps}
              >
                {isLastStep ? completeButtonText : nextButtonText}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StepContentWrapper({
  isCompleted,
  currentStep,
  direction,
  children,
  className,
}: {
  isCompleted: boolean;
  currentStep: number;
  direction: number;
  children: ReactNode;
  className?: string;
}) {
  const [parentHeight, setParentHeight] = useState(0);

  return (
    <motion.div
      className={className}
      style={{ position: "relative", overflow: "hidden" }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={stepHeightTransition}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted ? (
          <SlideTransition
            key={currentStep}
            direction={direction}
            onHeightReady={(height) => setParentHeight(height)}
          >
            {children}
          </SlideTransition>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export function SlideTransition({
  children,
  direction,
  onHeightReady,
}: {
  children: ReactNode;
  direction: number;
  onHeightReady: (height: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      onHeightReady(containerRef.current.offsetHeight);
    }
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={stepSlideTransition}
      style={{ position: "absolute", left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}
