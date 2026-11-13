import type { ReactNode } from "react";
import { ASSISTANT_TABS, LabsTabs } from "../../app/owner/labs-anterior/labs-tabs";

export default function KnowledgeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="vpa-stack" style={{ gap: 18 }}>
      <LabsTabs tabs={ASSISTANT_TABS} />
      {children}
    </div>
  );
}
