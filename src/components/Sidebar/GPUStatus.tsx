import { useGpuStatus } from "../../hooks/useGPUDetect";

function utilizationColor(pct: number): string {
  if (pct >= 85) {
    return "bg-tf-error";
  }
  if (pct >= 50) {
    return "bg-tf-warning";
  }
  return "bg-tf-success";
}

export function GPUStatus() {
  const gpu = useGpuStatus(3000);

  if (!gpu) {
    return (
      <div className="border-t border-tf-border p-2 text-[10px] text-tf-muted">GPU: …</div>
    );
  }

  const total = Math.max(1, gpu.vram_total_mb);
  const usedRatio = Math.min(1, gpu.vram_used_mb / total);

  return (
    <div className="border-t border-tf-border p-2">
      <div className="mb-1 flex items-center justify-between text-[10px] text-tf-muted">
        <span className="truncate" title={gpu.device_name || "No GPU"}>
          {gpu.device_name || "GPU"}
        </span>
        <span
          className={`ml-1 h-2 w-2 rounded-full ${
            gpu.cuda_available ? "bg-tf-success" : "bg-tf-error"
          }`}
        />
      </div>
      <div className="h-2 w-full bg-tf-base">
        <div
          className={`h-2 ${utilizationColor(gpu.gpu_utilization_pct)}`}
          style={{ width: `${Math.round(usedRatio * 100)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-tf-muted">
        <span>
          VRAM {gpu.vram_used_mb} / {gpu.vram_total_mb} MB
        </span>
        <span>{gpu.gpu_utilization_pct}% util</span>
      </div>
    </div>
  );
}
