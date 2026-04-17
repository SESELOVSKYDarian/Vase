"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Feature {
  id: string;
  badge: string;
  title: string;
  description: string;
  imageOrNode: React.ReactNode;
}

interface FeatureTabsProps {
  features: Feature[];
  title?: string;
  badge?: string;
  body?: string;
  plansLabel?: string;
}

export function FeatureTabs({ features, title, badge, body, plansLabel }: FeatureTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = features[activeIndex];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
      <section className="rounded-[2rem] bg-transparent p-2 shadow-none ring-0 sm:p-5 lg:p-6">
        {(badge || title) && (
          <div className="border-b border-[rgba(59,99,61,0.12)] pb-6">
            <div className="flex items-center justify-between gap-4">
              {badge ? <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#315032]">{badge}</p> : <span />}
              {plansLabel ? (
                <Link
                  href="/precios"
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[rgba(59,99,61,0.14)] bg-white px-4 text-sm font-semibold text-[#1f3121] transition hover:border-[rgba(59,99,61,0.26)] hover:bg-[#eef4ee]"
                >
                  {plansLabel}
                </Link>
              ) : null}
            </div>
            {title ? <h2 className="mt-4 text-2xl font-semibold tracking-[-0.045em] text-[#152116] sm:text-[2.25rem] sm:leading-tight">{title}</h2> : null}
            {body ? <p className="mt-4 max-w-xl text-[0.98rem] leading-7 text-[#43534d]">{body}</p> : null}
          </div>
        )}

        <div className="mt-5 grid gap-3">
          {features.map((feature, idx) => {
            const isActive = activeIndex === idx;

            return (
              <button
                key={feature.id}
                onClick={() => setActiveIndex(idx)}
                className={`group relative overflow-hidden rounded-[1.75rem] border px-5 py-5 text-left transition-all duration-300 outline-none ${
                  isActive
                    ? "border-[rgba(59,99,61,0.12)] bg-white shadow-[0_18px_30px_rgba(59,99,61,0.06)]"
                    : "border-[rgba(59,99,61,0.06)] bg-transparent hover:border-[rgba(59,99,61,0.1)] hover:bg-white/78"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#315032]">{feature.badge}</p>
                    <h3 className={`text-lg font-semibold tracking-tight ${isActive ? "text-[#152116]" : "text-[#2d3a35]"}`}>{feature.title}</h3>
                    <AnimatePresence initial={false}>
                      {isActive ? (
                        <motion.p
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="max-w-[34ch] text-sm leading-6 text-[#485852]"
                        >
                          {feature.description}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1 : 0.92,
                      opacity: isActive ? 1 : 0.72,
                    }}
                    className={`mt-1 h-3.5 w-3.5 rounded-full ${isActive ? "bg-[#3b633d] shadow-[0_0_0_6px_rgba(59,99,61,0.1)]" : "bg-[rgba(59,99,61,0.22)]"}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="relative min-h-[22rem] overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_60px_rgba(59,99,61,0.08)] ring-1 ring-[rgba(59,99,61,0.06)] sm:rounded-[2.35rem] lg:min-h-[32rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFeature.id}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.01 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-full items-center justify-center p-6 sm:p-8 lg:p-10"
          >
            <div className="pointer-events-none relative flex h-full w-full items-center justify-center">
              <motion.div
                initial={false}
                animate={{ rotate: activeIndex % 2 === 0 ? -3 : 3, scale: 1 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="relative z-10 flex min-h-[10rem] min-w-[10rem] items-center justify-center rounded-[1.8rem] bg-white p-6 shadow-[0_26px_56px_rgba(59,99,61,0.08)] ring-1 ring-[rgba(59,99,61,0.06)] sm:min-h-[14.5rem] sm:min-w-[14.5rem] sm:rounded-[2.2rem] sm:p-8"
              >
                {activeFeature.imageOrNode}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
