import { AlertCircle } from "lucide-react";

type FieldErrorProps = {
  message?: string;
};

/** Error debajo de un campo: aparece suave, con ícono, en un tono que no grita. */
export function FieldError({ message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="vase-field-in flex items-start gap-1.5 text-[13px] leading-5 text-[#b4532f]">
      <AlertCircle className="mt-[2px] h-[14px] w-[14px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
