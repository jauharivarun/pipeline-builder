// Backend base URL. Defaults to the port used by the assignment's run command
// (`uvicorn main:app --reload` → 8000). Override locally by setting
// REACT_APP_API_BASE in frontend/.env (e.g. http://127.0.0.1:8001).
// 127.0.0.1 is used instead of "localhost" because, on Windows, "localhost"
// can resolve to IPv6 first and hang.
export const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';

const DEFAULT_TIMEOUT_MS = 10000;

/**
 * fetch() with an AbortController timeout so the UI never spins forever
 * when the backend is down or hung.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        `Backend did not respond within ${timeoutMs / 1000}s. ` +
        'Make sure the server is running: uvicorn main:app --reload'
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
