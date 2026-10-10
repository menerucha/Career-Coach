export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details || []; }
  /** Server-side field errors as { fieldName: message } for showing next to inputs. */
  get fields() { return Object.fromEntries(this.details.map((d) => [d.field, d.message])); }
}

/** API client bound to a token getter (Clerk session token or demo token). */
export function createApi(getToken, base = import.meta.env?.VITE_API_BASE || '/api') {
  async function req(method, path, body) {
    const token = await getToken();
    let res;
    try {
      res = await fetch(base + path, { method, headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch { throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.'); }
    if (res.status === 204) return null;
    let data = null; try { data = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) throw new ApiError(res.status, data?.error?.code || 'HTTP_ERROR', data?.error?.message || `Request failed (${res.status})`, data?.error?.details);
    return data;
  }
  return {
    me: () => req('GET', '/me'), scenarios: () => req('GET', '/scenarios'), updateProfile: (p) => req('PUT', '/profile', p),
    analyze: (slug, body) => req('POST', `/analyze/${slug}`, body),
    listReports: ({ type, cursor, limit = 12 } = {}) => req('GET', `/reports?limit=${limit}${type ? `&type=${type}` : ''}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
    getReport: (id) => req('GET', `/reports/${encodeURIComponent(id)}`), deleteReport: (id) => req('DELETE', `/reports/${encodeURIComponent(id)}`),
  };
}
