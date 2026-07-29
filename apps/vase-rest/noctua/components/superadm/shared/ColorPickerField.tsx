'use client';

import { useState } from 'react';

interface ColorPickerFieldProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

export function ColorPickerField({ value, onChange, label }: ColorPickerFieldProps) {
  const [hex, setHex] = useState(value);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHex(newHex);
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      onChange(newHex);
    }
  };

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHex(newHex);
    onChange(newHex);
  };

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[#676b67] text-xs mr-2">{label}</span>}
      <div
        className="w-8 h-8 rounded-full border-2 border-[#252525] cursor-pointer overflow-hidden"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={handleColorInput}
          className="w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <input
        type="text"
        value={hex}
        onChange={handleHexChange}
        className="w-24 bg-[#0d0d0d] border border-[#252525] rounded px-2 py-1 text-white text-sm font-mono"
        maxLength={7}
      />
    </div>
  );
}
