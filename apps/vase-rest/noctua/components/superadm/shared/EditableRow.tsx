'use client';

import { useState, useRef, useEffect } from 'react';

interface EditableRowProps {
  value: string;
  onSave: (newValue: string) => void;
  children?: React.ReactNode;
}

export function EditableRow({ value, onSave, children }: EditableRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (currentValue.trim()) {
      onSave(currentValue.trim());
    } else {
      setCurrentValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="bg-[#0d0d0d] border border-violet-500 rounded px-2 py-1 text-white focus:outline-none"
      />
    );
  }

  return (
    <span onDoubleClick={() => setIsEditing(true)} className="cursor-pointer">
      {children || currentValue}
    </span>
  );
}
