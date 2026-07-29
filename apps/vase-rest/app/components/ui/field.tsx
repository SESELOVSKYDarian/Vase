import type { ReactNode } from "react";

export function Field(props: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="ui-field">
      <span>{props.label}</span>
      {props.children}
      {props.error ? <small role="alert">{props.error}</small> : null}
    </label>
  );
}
