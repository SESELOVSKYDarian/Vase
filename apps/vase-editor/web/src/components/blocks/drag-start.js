// Parte de HeroSlider: handleDragStart.
/** Arma handleDragStart con lo que necesita del componente. */
export function makeHandleDragStart({ buttonLimitX, buttonLimitY, buttonOffsetX, buttonOffsetY, dragRef, editorEnabled, heroSubtitleOffsetX, heroSubtitleOffsetY, heroTagOffsetX, heroTagOffsetY, heroTextOffsetX, heroTextOffsetY, heroTitleOffsetX, heroTitleOffsetY, textLimitX, textLimitY }) {
    return (event, target) => {
      if (!editorEnabled) return;
      if (event.button !== undefined && event.button !== 0 && event.pointerType !== "touch") return;
      event.preventDefault();
      event.stopPropagation();
    
      const isPartTarget = target.startsWith("part:");
      const partName = isPartTarget ? target.replace("part:", "") : "";
      const textPartOffsets = {
        tag: { x: heroTagOffsetX, y: heroTagOffsetY },
        title: { x: heroTitleOffsetX, y: heroTitleOffsetY },
        subtitle: { x: heroSubtitleOffsetX, y: heroSubtitleOffsetY },
      };
      const partBase = textPartOffsets[partName] || { x: 0, y: 0 };
      const base = isPartTarget
        ? { x: partBase.x, y: partBase.y, limitX: textLimitX, limitY: textLimitY }
        : target === "text"
          ? { x: heroTextOffsetX, y: heroTextOffsetY, limitX: textLimitX, limitY: textLimitY }
          : { x: buttonOffsetX, y: buttonOffsetY, limitX: buttonLimitX, limitY: buttonLimitY };
    
      dragRef.current = {
        target,
        startClientX: event.clientX,
        startClientY: event.clientY,
        baseX: base.x,
        baseY: base.y,
        limitX: base.limitX,
        limitY: base.limitY,
      };
    
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    };
}
