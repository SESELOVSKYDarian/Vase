"use client";

// Parte de rest-admin-workspace.tsx: RestPricingView, RestOperationsView, RestContractTenantView, plans, initialLimits.
import { type RestPlan, type RestPlanLimits } from "@vase/contracts";

export type RestPricingView = {
  id: string;
  plan: RestPlan;
  version: number;
  currency: string;
  monthlyPrice: number;
  limits: RestPlanLimits;
  effectiveAt: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
};

export type RestOperationsView = {
  tenants: Array<{
    globalTenantId: string;
    name: string;
    slug: string;
    entitlement: { plan: string; status: string; contractVersion: number };
    branchCount: number;
    staffCount: number;
    deviceCount: number;
    edgeCount: number;
    degradedIntegrations: number;
  }>;
  edges: Array<{
    id: string;
    globalTenantId: string;
    branchName: string;
    name: string;
    status: string;
    agentVersion: string | null;
    operationalState: "ONLINE" | "DEGRADED" | "OFFLINE" | "REVOKED";
    heartbeatLagSeconds: number | null;
    syncLagSeconds: number | null;
    pendingEventCount: number;
    failedPrintJobCount: number;
    lastErrorCode: string | null;
  }>;
};

export type RestContractTenantView = {
  globalTenantId: string;
  name: string;
  slug: string;
  status: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    hasExplicitModuleAccess: boolean;
    hasRestAccess: boolean;
  }>;
  restContract: null | {
    pricingVersionId: string;
    plan: RestPlan;
    status: string;
    contractVersion: number;
    monthlyPrice: number;
    currency: string;
  };
};

export const plans: RestPlan[] = ["STARTER", "GROWTH", "PRO", "ENTERPRISE"];
export const initialLimits: RestPlanLimits = {
  branches: 1,
  localEmployees: 15,
  devices: 5,
  edgeInstallations: 1,
};
