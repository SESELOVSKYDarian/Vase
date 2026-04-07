"use client";

import { motion } from "framer-motion";
import { Store } from "lucide-react";

export function HeroGraphic() {
  return (
    <div className="relative w-full max-w-2xl mx-auto h-[400px] md:h-[500px] flex items-center justify-center">
      {/* Background blobs for depth */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-64 h-64 bg-[rgba(59,99,61,0.15)] rounded-full blur-3xl opacity-60"
        style={{ top: '10%', left: '20%' }}
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, -90, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute w-72 h-72 bg-[rgba(115,147,116,0.15)] rounded-full blur-3xl opacity-60"
        style={{ bottom: '10%', right: '10%' }}
      />

      {/* Main Glassy Card */}
      <motion.div 
        initial={{ y: 50, opacity: 0, rotateX: 10 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 w-[24rem] rounded-[2.5rem] bg-white/70 backdrop-blur-2xl border border-[rgba(59,99,61,0.1)] shadow-[0_40px_80px_rgba(59,99,61,0.06)] overflow-hidden"
      >
        <div className="p-6 md:p-8 space-y-6">
          <div className="w-full flex items-center">
            <div className="size-12 rounded-2xl border border-[rgba(59,99,61,0.05)] bg-white shadow-[0_8px_16px_rgba(59,99,61,0.04)] flex items-center justify-center">
              <Store className="size-6 text-[var(--accent)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-[1.5rem] bg-white/80 border border-[rgba(59,99,61,0.08)] p-5 space-y-2 relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[rgba(59,99,61,0.08)] rounded-full blur-xl transform translate-x-4 -translate-y-4"/>
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--muted-soft)] relative z-10">Conversion</p>
              <p className="text-xl font-semibold text-[var(--foreground)] relative z-10">4.3%</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/80 border border-[rgba(59,99,61,0.08)] p-5 space-y-2 relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
             <div className="absolute top-0 left-0 w-16 h-16 bg-[rgba(115,147,116,0.12)] rounded-full blur-xl transform -translate-x-4 -translate-y-4"/>
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--muted-soft)] relative z-10">Orders</p>
              <p className="text-xl font-semibold text-[var(--foreground)] relative z-10">2,733</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
