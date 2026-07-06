// Central API client for the CEO backend.
//
// - Base URL comes from VITE_API_URL (see .env / .env.example).
// - Attaches the JWT bearer token from localStorage on every request.
// - Parses JSON, throws a useful Error on non-2xx, and on 401 clears the
//   session and bounces to the login page.
// - Supports the backend's backward-compatible list responses: endpoints
//   return either a plain array or { data, pagination }.

export const API_URL = (
  import.meta.env.VITE_API_URL || 'https://ceo-backend-oftj.onrender.com'
).replace(/\/$/, '');

export const TOKEN_KEY = 'token';
export const REFRESH_KEY = 'refreshToken';
export const USER_KEY = 'user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  let payload = body;

  // JSON-encode plain objects (leave FormData alone for file uploads).
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers: finalHeaders, body: payload });
  } catch (networkErr) {
    throw new ApiError(`Network error: ${networkErr.message}`, 0, null);
  }

  // 204 No Content
  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    // Session expired / invalid — clear and redirect to login.
    if (res.status === 401 && auth) {
      clearSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    const message =
      (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data;
}

/**
 * Normalize a list response to a plain array regardless of whether the backend
 * returned `[...]` or `{ data: [...], pagination }`.
 */
export const toArray = (res) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
};

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  request,
};

export { ApiError };
