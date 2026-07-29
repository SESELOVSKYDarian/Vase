'use client';

import { GripVertical } from 'lucide-react';

export function DragHandle() {
  return (
    <div className="cursor-grab active:cursor-grabbing text-[#676b67] hover:text-white">
      <GripVertical size={16} />
    </div>
  );
}
