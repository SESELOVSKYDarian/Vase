"use client";

import type { CSSProperties, MouseEvent } from "react";

export type StorefrontNavigateHandler = (
  href: string | undefined,
  event: MouseEvent<HTMLElement>,
) => void;

export type StorefrontAction = {
  label: string;
  href?: string;
  target?: "_self" | "_blank";
};

export type HeroSlide = {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  primaryAction?: StorefrontAction;
  secondaryAction?: StorefrontAction;
};

export type BrandItem = {
  id?: string;
  label: string;
  imageUrl?: string;
  href?: string;
  caption?: string;
};

export type FeaturedProduct = {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  priceLabel?: string;
  originalPriceLabel?: string;
  badgeText?: string;
  stockLabel?: string;
  inStock?: boolean;
};

export type ServiceItem = {
  icon?: string;
  title: string;
  text?: string;
  description?: string;
};

export type StatItem = {
  value: string;
  label: string;
  accent?: boolean;
};

export type TimelineItem = {
  year: string;
  title: string;
  text: string;
};

export type ValueItem = {
  icon?: string;
  title: string;
  description: string;
};

export type AboutHighlight = {
  icon?: string;
  title: string;
  text: string;
};

export type StorefrontSection = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  anchor?: string;
  enabled?: boolean;
};

export type BlockBaseProps = {
  className?: string;
  style?: CSSProperties;
  onNavigate?: StorefrontNavigateHandler;
};
