/**
 * Smart Scheduling System - Auth (login simulation + localStorage)
 * Store token, userRole, userId in localStorage.
 * Mock login credentials for development.
 */

const Auth = {
  STORAGE_KEY_TOKEN: 'scheduling_token',
  STORAGE_KEY_USER: 'scheduling_user',
  ROLES: { ADMIN: 'ADMIN', THERAPIST: 'THERAPIST', CLIENT: 'CLIENT' },

  /**
   * Mock users for login simulation
   */
  MOCK_USERS: [
    { email: 'admin@test.com', password: 'Admin123!', role: 'ADMIN', userId: 'admin-1', fullName: 'Admin User' },
    { email: 'therapist@test.com', password: 'Therapist123!', role: 'THERAPIST', userId: 'therapist-1', fullName: 'Jane Therapist' },
    { email: 'client@test.com', password: 'Client123!', role: 'CLIENT', userId: 'client-1', fullName: 'John Client' },
  ],

  /**
   * Get stored token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(this.STORAGE_KEY_TOKEN);
  },

  /**
   * Get stored user object { userId, role, email, fullName }
   * @returns {object|null}
   */
  getUser() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get current user role
   * @returns {string|null} ADMIN | THERAPIST | CLIENT
   */
  getRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  /**
   * Get current user id
   * @returns {string|null}
   */
  getUserId() {
    const user = this.getUser();
    return user ? user.userId : null;
  },

  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!this.getToken();
  },

  /**
   * Mock login: validate credentials and set localStorage
   * In production this would call API and set token from response.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ success: boolean, message?: string, user?: object }>}
   */
  async login(email, password) {
    const user = this.MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (user) {
      const token = 'mock-jwt-' + user.userId + '-' + Date.now();
      const userPayload = {
        userId: user.userId,
        role: user.role,
        email: user.email,
        fullName: user.fullName,
      };
      localStorage.setItem(this.STORAGE_KEY_TOKEN, token);
      localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(userPayload));
      return { success: true, user: userPayload };
    }
    return { success: false, message: 'Invalid email or password.' };
  },

  /**
   * Logout: clear storage and redirect to login
   */
  logout() {
    localStorage.removeItem(this.STORAGE_KEY_TOKEN);
    localStorage.removeItem(this.STORAGE_KEY_USER);
    window.location.href = 'login.html';
  },

  /**
   * Register (simulation): for now just redirect to login after "register"
   * Backend would create user and return token.
   * @param {object} data - { email, password, fullName, role }
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async register(data) {
    const exists = this.MOCK_USERS.some((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    return { success: true, message: 'Registration successful. Please log in.' };
  },
};

if (typeof window !== 'undefined') {
  window.Auth = Auth;
}
