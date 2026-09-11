"use client";

import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

type ChartSize = { width: number; height: number };

class ChartErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[analytics chart] render failed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ChartFallback title="No se pudo renderizar este gráfico." onRetry={() => { this.setState({ error: null }); this.props.onRetry(); }} />;
    }
    return this.props.children;
  }
}

export function ChartShell({ label, children }: { label: string; children: (size: ChartSize) => ReactNode }) {
  const element = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const measure = useCallback(() => {
    const node = element.current;
    if (!node) return;
    const next = { width: Math.floor(node.clientWidth), height: Math.floor(node.clientHeight) };
    setSize((current) => current.width === next.width && current.height === next.height ? current : next);
  }, []);

  useEffect(() => {
    measure();
    const node = element.current;
    if (!node) return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    const timeout = window.setTimeout(() => setStalled(true), 1200);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [attempt, measure]);

  const retry = useCallback(() => {
    setStalled(false);
    measure();
    setAttempt((value) => value + 1);
  }, [measure]);
  const ready = size.width > 0 && size.height >= 180;

  return (
    <div ref={element} className="chart-enter h-full min-h-[220px] w-full" role="img" aria-label={label}>
      {ready ? <ChartErrorBoundary key={attempt} onRetry={retry}>{children(size)}</ChartErrorBoundary> : stalled ? <ChartFallback title="No se pudo medir el espacio del gráfico." description="Reintentá la visualización." onRetry={retry} /> : <ChartSkeleton />}
    </div>
  );
}

function ChartFallback({ title, description = "Ocurrió un error inesperado.", onRetry }: { title: string; description?: string; onRetry: () => void }) {
  return <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-secondary/25 px-6 text-center"><div><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p><button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none">Reintentar</button></div></div>;
}

function ChartSkeleton() {
  return <div className="h-full min-h-[220px] animate-pulse rounded-xl bg-secondary/35"><div className="flex h-full items-end gap-3 p-5"><i className="h-[28%] flex-1 rounded-t-md bg-muted" /><i className="h-[62%] flex-1 rounded-t-md bg-muted" /><i className="h-[44%] flex-1 rounded-t-md bg-muted" /><i className="h-[76%] flex-1 rounded-t-md bg-muted" /><i className="h-[54%] flex-1 rounded-t-md bg-muted" /></div></div>;
}

