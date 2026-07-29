'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardData, DateRange } from '@/types/analytics';
import { fetchAllAnalytics } from '@/services/analyticsService';

interface DashboardDataState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboardData(dateRange: DateRange): DashboardDataState {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refetch = useCallback(async () => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAllAnalytics(dateRange.from, dateRange.to, dateRange.preset);

      if (requestId.current !== currentRequest) return;

      setData(result);
    } catch (err) {
      if (requestId.current !== currentRequest) return;
      setError(err instanceof Error ? err.message : 'Error al cargar los datos. Intentá de nuevo.');
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [dateRange.from, dateRange.preset, dateRange.to]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refetch();
    }, dateRange.preset === 'personalizado' ? 500 : 0);

    return () => window.clearTimeout(timeout);
  }, [dateRange.preset, refetch]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
