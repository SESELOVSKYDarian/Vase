import React from 'react';

export default function FeaturesBentoGrid({
    title1 = "Retail Innovation",
    description1 = "Redefining the physical brand experience.",
    image1 = "https://lh3.googleusercontent.com/aida-public/AB6AXuC5O2IEmFumPDYbXt4OSbQ76NVl3Aoe67zfEH_cFozMeXwmgyV8lto8EyHNp6EZyE-SiEDx894wrZl97eErjTtEiOOCEAanDMiQEUHhOUz5PCZz9OZef8Wu-tHWjdT-RJRsZc42lQCmHGClsvTtwJ5PivA55b6qinn-W0w6vHMAnUyNfiBtrKF3iSHNEEtyjPoGwDmpGTad4ygpZV2CHPA7JR9-xXCCjJEs6cpOmHzhvOTOzpA6hQcN6M-zBHV2rNA-6AtwmOV0e_Yl",
    title2 = "Adaptive Design Philosophy",
    description2 = "Our approach is rooted in the belief that every space should be a reflection of intent and precision.",
    cta2 = "View More",
    image3 = "https://lh3.googleusercontent.com/aida-public/AB6AXuDku0ZbqeF1isiIwWBwBuM0aySkXeRX3PZQNwDzgbKFuSv4UBY6psFDooiMMOXHlY2-3RLWkS0P6Zwp6deGMAKtN2p2oKa_zJp2L8Q4by8oz5g68qkhCS_Xyhc4cTap0_Z6mdFxpY1lBy4L_oEM9ulvFeRiwMsakiT9CqaNNRRePHWgFv2tsKq-TnD1BYjokUODeIK-TEN3XHvZCmFztKRCAHKRHPC7x8UHUCKChydqhtUOuvXe_s2OqvtxNbLzjdiaYytY_6w0uVkf",
    image4 = "https://lh3.googleusercontent.com/aida-public/AB6AXuCfAl6OM7CDj-zIL13TRozjwVOr_3_2M1wIAfLLbggrwIHS_76KeRoDbm85B3uplOUGfCJ2dCdYloaHJpOY2XkaXat6X4o_fM6gjBUK5a3OTb99SXo9z2rprwN5qeelhuQVvspMV__YrgXrVyNuF9vCd4IcAE81b3wKFC_dn2_7G_RtRj1NX1bsj5rfUbYyn4sH21Ait6CjboQyF4RkUu2ufH2tW8IwNnPvK2JFcynxMJukCDaik0hSJfaGb2fui8SeNlc1LLdpv12I",
    cta4 = "Explore Workspace",
    styles = {}
}) {
    const {
        backgroundColor = "#ffffff",
        titleColor = "#000000",
        textColor = "#444748",
        accentColor = "#4648d4"
    } = styles;

    return (
        <section className="py-20 px-8 max-w-screen-2xl mx-auto" style={{ backgroundColor }}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Block 1: 8 columns, 16/9 */}
                <div className="md:col-span-8 group relative overflow-hidden rounded-xl border border-zinc-200 aspect-[16/9]">
                    <img
                        src={image1}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        alt={title1}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                        <div className="text-white">
                            <h3 className="text-3xl font-bold font-['Manrope']">{title1}</h3>
                            <p className="opacity-80 font-['Inter']">{description1}</p>
                        </div>
                    </div>
                </div>

                {/* Block 2: 4 columns, text based */}
                <div className="md:col-span-4 bg-zinc-50 border border-zinc-200 p-12 flex flex-col justify-between rounded-xl">
                    <div className="space-y-6">
                        <span className="material-symbols-outlined text-4xl" style={{ color: accentColor }}>auto_awesome</span>
                        <h3 className="text-2xl font-bold text-zinc-900 font-['Manrope']" style={{ color: titleColor }}>{title2}</h3>
                        <p className="text-zinc-600 font-['Inter']" style={{ color: textColor }}>{description2}</p>
                    </div>
                    <a className="inline-flex items-center gap-2 font-bold uppercase tracking-widest text-zinc-900 hover:gap-4 transition-all text-[12px]" href="/catalog">
                        {cta2} <span className="material-symbols-outlined">east</span>
                    </a>
                </div>

                {/* Block 3: 4 columns, aspect-square/auto */}
                <div className="md:col-span-4 group relative overflow-hidden rounded-xl border border-zinc-200 aspect-square md:aspect-auto">
                    <img
                        src={image3}
                        className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                        alt="Gallery Image 1"
                    />
                </div>

                {/* Block 4: 8 columns, 16/7 */}
                <div className="md:col-span-8 group relative overflow-hidden rounded-xl border border-zinc-200 aspect-[16/7]">
                    <img
                        src={image4}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        alt="Gallery Image 2"
                    />
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="bg-black text-white px-8 py-3 rounded-lg text-[11px] font-bold uppercase tracking-widest active:scale-95">
                            {cta4}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
