"""
TorchForge starter project: PyTorch module + Triton ReLU kernel + tiny training loop.
Requires a CUDA GPU (Triton does not target CPU for these kernels).
"""

from __future__ import annotations

import time

import torch
import torch.nn as nn
import triton
import triton.language as tl


def _vram_mb() -> tuple[int, int]:
    if not torch.cuda.is_available():
        return 0, 0
    dev = torch.cuda.current_device()
    free_b, total_b = torch.cuda.mem_get_info(dev)
    used_b = total_b - free_b
    return int(used_b / (1024 * 1024)), int(total_b / (1024 * 1024))


@triton.jit
def relu_kernel(
    x_ptr,
    y_ptr,
    n_elements,
    BLOCK_SIZE: tl.constexpr,
):
    pid = tl.program_id(axis=0)
    block_start = pid * BLOCK_SIZE
    offsets = block_start + tl.arange(0, BLOCK_SIZE)
    mask = offsets < n_elements
    x = tl.load(x_ptr + offsets, mask=mask, other=0.0)
    y = tl.maximum(x, 0.0)
    tl.store(y_ptr + offsets, y, mask=mask)


def relu_triton(x: torch.Tensor) -> torch.Tensor:
    assert x.is_cuda, "This example expects CUDA tensors."
    x = x.contiguous()
    out = torch.empty_like(x)
    n = x.numel()
    BLOCK_SIZE = 1024
    grid = (triton.cdiv(n, BLOCK_SIZE),)
    relu_kernel[grid](x, out, n, BLOCK_SIZE=BLOCK_SIZE)
    return out


class TinyMLP(nn.Module):
    def __init__(self, dim: int) -> None:
        super().__init__()
        self.fc1 = nn.Linear(dim, dim)
        self.fc2 = nn.Linear(dim, dim)
        self._last_relu_ms = 0.0

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.fc1(x)
        torch.cuda.synchronize()
        t0 = time.perf_counter()
        x = relu_triton(x)
        torch.cuda.synchronize()
        t1 = time.perf_counter()
        self._last_relu_ms = (t1 - t0) * 1000.0
        return self.fc2(x)


def main() -> None:
    if not torch.cuda.is_available():
        raise SystemExit("CUDA is required for this TorchForge example.")

    torch.manual_seed(0)
    device = torch.device("cuda")

    used0, total0 = _vram_mb()
    print(f"[VRAM] before alloc: used={used0} MB / total={total0} MB")

    dim = 4096
    batch = 64
    model = TinyMLP(dim).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()

    x = torch.randn(batch, dim, device=device)
    y = torch.randn(batch, dim, device=device)

    used1, total1 = _vram_mb()
    print(f"[VRAM] after tensors+model: used={used1} MB / total={total1} MB")

    model.train()
    for step in range(5):
        opt.zero_grad(set_to_none=True)
        pred = model(x)
        loss = loss_fn(pred, y)
        loss.backward()
        opt.step()
        torch.cuda.synchronize()
        relu_ms = getattr(model, "_last_relu_ms", 0.0)
        print(f"step={step} loss={loss.item():.6f} relu_kernel_ms={relu_ms:.3f}")

    used2, total2 = _vram_mb()
    print(f"[VRAM] after training: used={used2} MB / total={total2} MB")
    print("Done.")


if __name__ == "__main__":
    main()
