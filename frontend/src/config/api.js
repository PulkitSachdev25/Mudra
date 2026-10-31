/**
 * Mudrā API & WebSocket Endpoint Configuration
 *
 * In local development (Vite dev server), relative URLs can be proxied.
 * In production builds (Vercel, preview, or static deploy), requests are routed
 * directly to the live Render backend service.
 */

export const RENDER_BACKEND_ORIGIN = 'https://mudra-dwn3.onrender.com';

export function getBackendBaseUrl() {
  // 1. Check for custom Vite environment variable if configured
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
  }

  // 2. In local dev mode (npm run dev), use relative path so Vite proxy handles it
  if (import.meta.env.DEV) {
    return '';
  }

  // 3. In production builds (e.g. Vercel deployment), point directly to Render
  return RENDER_BACKEND_ORIGIN;
}

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getBackendBaseUrl();
  return base ? `${base}${cleanPath}` : cleanPath;
}

export function getWebSocketUrl(roomCode, clientType) {
  const base = getBackendBaseUrl();

  if (base) {
    const isHttps = base.startsWith('https:');
    const wsProtocol = isHttps ? 'wss:' : 'ws:';
    const host = base.replace(/^https?:\/\//, '');
    return `${wsProtocol}//${host}/ws/${roomCode}/${clientType}`;
  }

  // Dev mode proxy fallback
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/${roomCode}/${clientType}`;
}
