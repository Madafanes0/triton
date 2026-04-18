/**
 * Base URL del backend FastAPI.
 * En desarrollo, Vite hace proxy de `/api` → `http://127.0.0.1:7433` para evitar
 * errores de red/CORS en Electron al llamar a otro puerto.
 */
export const API_BASE = import.meta.env.DEV ? "/api" : "http://127.0.0.1:7433";
