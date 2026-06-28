import React from "react";

export default function PiquimTresMundos({
  eyebrow = "RECORRE NUESTRAS 3 GRANDES FAMILIAS",
  subtitle = "",
  titleStart = "Un balde.",
  titleHighlight = "Tres mundos",
  titleEnd = "de creacion.",
  description = "Desde el helado artesanal hasta la torta mas sofisticada, el balde Piquim te acompana en cada paso.",
  leftImage = "/piquim/product-bucket.png",
  rightImage = "/piquim/product-bucket.png",
}) {
  return (
    <section className="relative overflow-hidden bg-[#fffaf6] px-4 py-20 md:px-[80px] md:py-[100px]">
      <div className="mx-auto max-w-[1317px] text-center">
        <p className="text-[12px] font-semibold tracking-[2.4px] text-[#ff4d00]">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-[42px] font-black leading-none tracking-[-1px] text-[#1a1614] md:text-[66px]">
          {titleStart}{" "}
          <span className="italic text-[#ff4d00]">{titleHighlight}</span>
          <br />
          {titleEnd}
        </h2>
        <p className="mx-auto mt-6 max-w-[620px] text-[13px] leading-[1.55] text-[#4a4441]">
          {subtitle || description}
        </p>

        <div className="mt-1 -mb-3 flex items-end justify-center gap-0 md:hidden">
          <img
            src={leftImage}
            alt="Balde izquierdo"
            className="w-[60%] max-w-[400px] -rotate-12 opacity-95"
          />
          <img
            src={rightImage}
            alt="Balde derecho"
            className="w-[60%] max-w-[300px] rotate-12 opacity-95"
          />
        </div>
      </div>

      <img
        src={leftImage}
        alt="Balde izquierdo"
        className="pointer-events-none absolute -left-2 top-[-10px] hidden w-[430px] -rotate-12 opacity-95 md:block lg:w-[470px]"
      />
      <img
        src={rightImage}
        alt="Balde derecho"
        className="pointer-events-none absolute -right-2 top-[-6px] hidden w-[450px] rotate-12 opacity-95 md:block lg:w-[490px]"
      />
    </section>
  );
}
