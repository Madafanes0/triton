import { useEffect, useState } from "react";
import { api } from "./useBackend";

export interface GpuStatus {
  cuda_available: boolean;
  device_name: string;
  vram_total_mb: number;
  vram_used_mb: number;
  vram_free_mb: number;
  gpu_utilization_pct: number;
  driver_version: string;
}

export function useGpuStatus(pollMs: number = 3000): GpuStatus | null {
  const [status, setStatus] = useState<GpuStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get<GpuStatus>("/gpu/status");
        if (!cancelled) {
          setStatus(data);
        }
      } catch {
        if (!cancelled) {
          setStatus({
            cuda_available: false,
            device_name: "",
            vram_total_mb: 0,
            vram_used_mb: 0,
            vram_free_mb: 0,
            gpu_utilization_pct: 0,
            driver_version: "",
          });
        }
      }
    }

    void load();
    const id = window.setInterval(load, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return status;
}
