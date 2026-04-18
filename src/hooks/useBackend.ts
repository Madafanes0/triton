import axios, { AxiosError } from "axios";

const BASE = "http://127.0.0.1:7433";

export const api = axios.create({
  baseURL: BASE,
  timeout: 0,
  headers: { "Content-Type": "application/json" },
});

export function isApiError(err: unknown): err is AxiosError<{ error?: string; message?: string }> {
  return axios.isAxiosError(err);
}

export function getErrorPayload(err: unknown): { code: string; message: string } {
  if (isApiError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    return {
      code: data?.error ?? String(err.response?.status ?? "REQUEST_FAILED"),
      message: data?.message ?? err.message,
    };
  }
  if (err instanceof Error) {
    return { code: "ERROR", message: err.message };
  }
  return { code: "ERROR", message: String(err) };
}
