import React from 'react';

const DEFAULT_TEXT = 'ENVIO GRATUITO en pedidos +$50.000 ARG  ·  10% OFF en tu primera compra  ·  Industria Argentina  ·  Hecho en Mar del Plata';

export default function PiquimAnnounceBar({ text = DEFAULT_TEXT }) {
  return (
    <div className="bg-[#1a1614] flex items-center justify-center py-3 w-full overflow-hidden">
      <div className="px-4">
        <p className="text-[#fffaf6] text-[11px] tracking-[0.44px] text-center">{text}</p>
      </div>
    </div>
  );
}
