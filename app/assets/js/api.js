/**
 * Smart Scheduling System - API client
 * Backend-ready: uses API_BASE_URL, attach token to Authorization header.
 * Uses fetch() with async/await and error handling.
 * Mock data used when API fails or is unavailable.
 */

const API_BASE_URL = 'http://localhost:8080/api';

/**
 * Get auth header for requests
 * @returns {{ Authorization?: string }}
 */
function getAuthHeader() {
  const token = typeof Auth !== 'undefined' && Auth.getToken ? Auth.getToken() : localStorage.getItem('scheduling_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Generic request helper
 * @param {string} path - e.g. '/sessions'
 * @param {object} options - fetch options
 * @returns {Promise<object>}
 */
async function apiRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };
  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: data.message || res.statusText, data };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message || 'Network error', status: 0 };
  }
}

const api = {
  /**
   * Login (backend would return token)
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Register
   * @param {object} body - { email, password, fullName, role }
   */
  async register(body) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Get sessions (all for admin, filtered by role on backend)
   * @param {object} params - { therapistId, clientId, status, from, to }
   */
  async getSessions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/sessions${qs ? '?' + qs : ''}`);
  },

  /**
   * Get therapists list (for directory / admin)
   */
  async getTherapists() {
    return apiRequest('/therapists');
  },

  /**
   * Get users (admin) - clients and therapists
   */
  async getUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/admin/users${qs ? '?' + qs : ''}`);
  },

  /**
   * Create availability block (therapist)
   * @param {object} body - { dayOfWeek, startTime, endTime } or similar
   */
  async createAvailability(body) {
    return apiRequest('/availability', { method: 'POST', body: JSON.stringify(body) });
  },

  /**
   * Delete availability
   * @param {string} id
   */
  async deleteAvailability(id) {
    return apiRequest(`/availability/${id}`, { method: 'DELETE' });
  },

  /**
   * Book a session (client)
   * @param {object} body - { therapistId, slotId, date, time }
   */
  async bookSession(body) {
    return apiRequest('/sessions', { method: 'POST', body: JSON.stringify(body) });
  },

  /**
   * Update session (reschedule, cancel, mark completed)
   * @param {string} id
   * @param {object} body
   */
  async updateSession(id, body) {
    return apiRequest(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  },

  /**
   * Cancel session
   * @param {string} id
   */
  async cancelSession(id) {
    return apiRequest(`/sessions/${id}/cancel`, { method: 'POST' });
  },
};

// Mock data for when API fails or is not used (login simulation)
const MOCK_SESSIONS = [
  { id: 's1', therapistId: 'therapist-1', therapistName: 'Jane Therapist', clientId: 'client-1', clientName: 'John Client', date: '2025-02-10', time: '10:00', status: 'BOOKED', duration: 60 },
  { id: 's2', therapistId: 'therapist-1', therapistName: 'Jane Therapist', clientId: 'client-1', clientName: 'John Client', date: '2025-02-05', time: '14:00', status: 'COMPLETED', duration: 60 },
  { id: 's3', therapistId: 'therapist-1', therapistName: 'Jane Therapist', clientId: 'client-2', clientName: 'Alice Client', date: '2025-02-12', time: '09:00', status: 'BOOKED', duration: 45 },
];
const MOCK_THERAPISTS = [
  { id: 'therapist-1', fullName: 'Jane Therapist', email: 'therapist@test.com', specialties: ['Anxiety', 'Depression'], rating: 4.8, imageUrl: '' },
  { id: 'therapist-2', fullName: 'Bob Smith', email: 'bob@test.com', specialties: ['PTSD', 'Trauma'], rating: 4.6, imageUrl: '' },
];
const MOCK_USERS = [
  { id: 'admin-1', fullName: 'Admin User', email: 'admin@test.com', role: 'ADMIN', active: true },
  { id: 'therapist-1', fullName: 'Jane Therapist', email: 'therapist@test.com', role: 'THERAPIST', active: true },
  { id: 'client-1', fullName: 'John Client', email: 'client@test.com', role: 'CLIENT', active: true },
];

/**
 * Get sessions with fallback to mock data
 * @param {string} role - ADMIN | THERAPIST | CLIENT
 * @param {string} userId
 */
async function getSessionsWithFallback(role, userId) {
  const res = await api.getSessions();
  if (res.ok && Array.isArray(res.data)) return res.data;
  let list = [...MOCK_SESSIONS];
  if (role === 'THERAPIST') list = list.filter((s) => s.therapistId === userId);
  if (role === 'CLIENT') list = list.filter((s) => s.clientId === userId);
  return list;
}

/**
 * Get therapists with fallback to mock data
 */
async function getTherapistsWithFallback() {
  const res = await api.getTherapists();
  if (res.ok && Array.isArray(res.data)) return res.data;
  return MOCK_THERAPISTS;
}

/**
 * Get users (admin) with fallback to mock data
 */
async function getUsersWithFallback() {
  const res = await api.getUsers();
  if (res.ok && Array.isArray(res.data)) return res.data;
  return MOCK_USERS;
}

if (typeof window !== 'undefined') {
  window.api = api;
  window.getSessionsWithFallback = getSessionsWithFallback;
  window.getTherapistsWithFallback = getTherapistsWithFallback;
  window.getUsersWithFallback = getUsersWithFallback;
}
