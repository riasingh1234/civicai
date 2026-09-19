// Where Flask lives: explicit env var first, then Codespaces port forwarding,
// then localhost, then the deployed Render instance.
function resolveBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  const host = window.location.hostname;
  if (host.includes('app.github.dev')) return `https://${host.replace('-5173', '-8000')}`;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8000';
  return 'https://civicai-backend-nbys.onrender.com';
}

const BASE = resolveBase();

async function req(path, options = {}) {
  const res = await fetch(BASE + path, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

function json(path, method, payload) {
  return req(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Image URLs come back either absolute (Supabase) or as /uploads/... from Flask.
export function imageUrl(url) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? BASE + url : url;
}

export const api = {
  health: () => req('/'),

  analyzeImage(file, { location, description, coords }) {
    const form = new FormData();
    form.append('image', file);
    form.append('location', location || '');
    form.append('description', description || '');
    if (coords) {
      form.append('lat', coords.lat);
      form.append('lng', coords.lng);
    }
    return req('/analyze', { method: 'POST', body: form });
  },

  analyzeText: (payload) => json('/analyze-text', 'POST', payload),

  listReports(filters = {}) {
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== 'All') q.append(k, v);
    });
    const qs = q.toString();
    return req('/reports' + (qs ? `?${qs}` : ''));
  },

  createReport: (payload) => json('/reports', 'POST', payload),
  updateReport: (id, patch) => json(`/reports/${id}`, 'PATCH', patch),

  verifyResolution(id, file, note) {
    const form = new FormData();
    form.append('image', file);
    form.append('note', note || '');
    return req(`/reports/${id}/verify`, { method: 'POST', body: form });
  },

  notifications(reportIds = []) {
    const qs = reportIds.length ? `?report_ids=${reportIds.join(',')}` : '';
    return req('/notifications' + qs);
  },
  markRead: (ids) => json('/notifications/read', 'POST', { ids }),

  geocode: (query) => json('/geocode', 'POST', { query }),
  reverseGeocode: (lat, lng) => json('/geocode', 'POST', { lat, lng }),

  analytics: () => req('/analytics'),

  actionPlan: (payload) => json('/api/generate-action-plan', 'POST', payload),
};
