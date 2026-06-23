import type { ReactNode } from "react";
import { createElement } from "react";

export function AppFrame(props: { title: string; children: ReactNode }) {
  return createElement(
    "main",
    { style: { fontFamily: "sans-serif", padding: 24 } },
    createElement("h1", null, props.title),
    props.children,
  );
}
