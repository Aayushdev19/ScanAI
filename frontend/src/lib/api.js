const BASE = import.meta.env.VITE_API_BASE_URL || '';

function getToken() {
  return localStorage.getItem('scanai_token');
}

async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Backend server is not running. Start FastAPI on port 8001 and try again.');
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server error: ${res.status}`);
  }
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }),

  me: () => request('/auth/me'),

  // Scans
  upload: (file, mode) => {
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    return request('/scan/upload', { method: 'POST', body: form });
  },

  result: (scanId) => request(`/scan/result/${scanId}`),

  history: () => request('/scan/history'),
};

export function saveToken(token) {
  localStorage.setItem('scanai_token', token);
}

export function clearToken() {
  localStorage.removeItem('scanai_token');
}

export function hasToken() {
  return !!getToken();
}
