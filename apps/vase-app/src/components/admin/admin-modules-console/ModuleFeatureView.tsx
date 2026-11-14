"use client";

// Parte de admin-modules-console.tsx: SubmoduleView, ModuleFeatureView, ModuleView, Props, initialState, ModuleModalMode y más.
import { type AdminGovernanceActionState } from "@/app/(platform)/app/admin/actions";

export type SubmoduleView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  route: string;
  isActive: boolean;
  features: ModuleFeatureView[];
};

export type ModuleFeatureView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  valueType: "BOOLEAN" | "INTEGER" | "TEXT";
  trialDefault: boolean | number | string | null;
  activeDefault: boolean | number | string | null;
  minValue: number | null;
  maxValue: number | null;
  sortOrder: number;
  isActive: boolean;
};

export type ModuleView = {
  id: string;
  name: string;
  description: string | null;
  product: "BUSINESS" | "LABS" | "MANAGEMENT" | "REST";
  route: string;
  isActive: boolean;
  features: ModuleFeatureView[];
  submodules: SubmoduleView[];
};

export type Props = {
  modules: ModuleView[];
  initialExpandedModuleIds?: string[];
};

export const initialState: AdminGovernanceActionState = {};

export type ModuleModalMode = "create" | "edit";
export type SubmoduleModalMode = "create" | "edit";
export type FeatureModalMode = "create" | "edit";

export function formatFeatureDefault(value: ModuleFeatureView["trialDefault"]) {
  return value === null ? "" : String(value);
}
