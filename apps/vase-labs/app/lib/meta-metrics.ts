import type { LabsChannel } from "@vase/contracts";

type MetaMetric = {
  event:
    | "connection_started"
    | "connection_completed"
    | "connection_cancelled"
    | "connection_failed"
    | "webhook_rejected"
    | "reconnect_required";
  channelType?: LabsChannel;
  globalTenantId?: string;
  errorCode?: string;
};

export function createMetaMetrics(
  sink: (event: { scope: "meta_channels" } & MetaMetric) => void = (event) =>
    console.info(JSON.stringify(event)),
) {
  return {
    record(event: MetaMetric) {
      sink({ scope: "meta_channels", ...event });
    },
  };
}

export const metaMetrics = createMetaMetrics();
