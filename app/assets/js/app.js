/**
 * Smart Scheduling System - Main app logic
 * Role-based navigation, route protection, sidebar, access denied.
 * Load this on every dashboard page after auth.js and api.js.
 */

(function () {
  const ROLES = { ADMIN: 'ADMIN', THERAPIST: 'THERAPIST', CLIENT: 'CLIENT' };

  /**
   * Pages allowed per role (page filename without .html => roles that can access)
   */
  const PAGE_ACCESS = {
    'dashboard': [ROLES.ADMIN, ROLES.THERAPIST, ROLES.CLIENT],
    'my-schedule': [ROLES.ADMIN, ROLES.THERAPIST, ROLES.CLIENT],
    'manage-users': [ROLES.ADMIN],
    'manage-sessions': [ROLES.ADMIN],
    'therapist-directory': [ROLES.CLIENT],
    'settings': [ROLES.ADMIN, ROLES.THERAPIST, ROLES.CLIENT],
  };

  /**
   * Sidebar menu items: { href, label, icon, roles[] }
   */
  const MENU_ITEMS = [
    { href: 'dashboard.html', label: 'Dashboard', icon: 'bi-grid-1x2', roles: [ROLES.ADMIN, ROLES.THERAPIST, ROLES.CLIENT] },
    { href: 'manage-users.html', label: 'Manage Users', icon: 'bi-people', roles: [ROLES.ADMIN] },
    { href: 'manage-sessions.html', label: 'Manage Sessions', icon: 'bi-calendar-check', roles: [ROLES.ADMIN] },
    { href: 'therapist-directory.html', label: 'Therapist Directory', icon: 'bi-person-badge', roles: [ROLES.CLIENT] },
    { href: 'my-schedule.html', label: 'My Schedule', icon: 'bi-calendar3', roles: [ROLES.THERAPIST, ROLES.CLIENT] },
    { href: 'my-schedule.html', label: 'Schedules', labelAlt: 'Schedules', icon: 'bi-calendar3', roles: [ROLES.ADMIN] },
    { href: 'settings.html', label: 'Settings', icon: 'bi-gear', roles: [ROLES.ADMIN, ROLES.THERAPIST, ROLES.CLIENT] },
  ];

  /**
   * Get current page name from path (e.g. dashboard.html -> dashboard)
   */
  function getCurrentPage() {
    const path = window.location.pathname;
    const base = path.split('/').pop() || path;
    return base.replace(/\.html$/, '') || 'dashboard';
  }

  /**
   * Check if current user can access the given page
   * @param {string} pageName - e.g. 'manage-users'
   * @param {string} role
   */
  function canAccessPage(pageName, role) {
    const allowed = PAGE_ACCESS[pageName];
    if (!allowed) return true;
    return allowed.includes(role);
  }

  /**
   * Redirect to login if not logged in
   * @returns {boolean} true if logged in
   */
  function requireAuth() {
    if (typeof Auth === 'undefined') return false;
    if (!Auth.isLoggedIn()) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
      return false;
    }
    return true;
  }

  /**
   * Show access denied section and hide main content; hide menu items not allowed
   * Call this on pages that have role restrictions (e.g. manage-users = admin only).
   */
  function enforceRoleAccess() {
    const role = Auth.getRole();
    const pageName = getCurrentPage();

    if (!canAccessPage(pageName, role)) {
      const main = document.getElementById('main-content-area');
      const denied = document.getElementById('access-denied-section');
      if (main) main.style.display = 'none';
      if (denied) denied.style.display = 'flex';
      return false;
    }

    const denied = document.getElementById('access-denied-section');
    if (denied) denied.style.display = 'none';
    return true;
  }

  /**
   * Build sidebar nav HTML for current role (only show allowed items)
   */
  function renderSidebar() {
    const role = Auth.getRole();
    if (!role) return '';

    const currentPage = getCurrentPage();
    const items = MENU_ITEMS.filter((m) => m.roles.includes(role));

    // Admin gets "Schedules" for my-schedule; therapist/client get "My Schedule"
    const list = items.map((item) => {
      const label = item.labelAlt && role === ROLES.ADMIN && item.href === 'my-schedule.html' ? item.labelAlt : item.label;
      const isActive = getCurrentPage() === item.href.replace('.html', '');
      return `<a class="nav-link ${isActive ? 'active' : ''}" href="${item.href}"><i class="bi ${item.icon}"></i><span>${label}</span></a>`;
    });

    return `
      <div class="sidebar-brand">Smart Scheduling</div>
      <nav class="sidebar-nav">
        ${list.join('')}
      </nav>
    `;
  }

  /**
   * Build topbar with user info and logout
   */
  function renderTopbar() {
    const user = Auth.getUser();
    if (!user) return '';

    const roleBadge = user.role.charAt(0) + user.role.slice(1).toLowerCase();
    return `
      <div class="user-info">
        <span>${user.fullName || user.email}</span>
        <span class="badge bg-primary badge-role">${roleBadge}</span>
      </div>
      <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-logout" aria-label="Log out">
        <i class="bi bi-box-arrow-right"></i> Logout
      </button>
    `;
  }

  /**
   * Initialize layout: inject sidebar and topbar, bind logout, enforce access
   */
  function initApp() {
    if (typeof Auth === 'undefined') return;

    const isAuthPage = ['login', 'register'].includes(getCurrentPage());
    const isLanding = getCurrentPage() === 'index' || window.location.pathname.endsWith('/') || window.location.pathname === '';

    if (!isAuthPage && !isLanding) {
      if (!requireAuth()) return;

      const sidebarEl = document.getElementById('sidebar');
      const topbarEl = document.getElementById('topbar');
      if (sidebarEl) {
        sidebarEl.innerHTML = renderSidebar();
        const toggle = document.getElementById('sidebar-toggle');
        const overlay = document.getElementById('sidebar-overlay');
        if (toggle && sidebarEl) {
          toggle.addEventListener('click', () => {
            sidebarEl.classList.toggle('show');
            if (overlay) overlay.classList.toggle('show');
          });
        }
        if (overlay) {
          overlay.addEventListener('click', () => {
            sidebarEl.classList.remove('show');
            overlay.classList.remove('show');
          });
        }
      }
      if (topbarEl) topbarEl.innerHTML = renderTopbar();

      document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

      enforceRoleAccess();
    }
  }

  // Run when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Expose helpers globally for page-specific scripts
  window.App = window.App || {};
  window.App.getCurrentPage = getCurrentPage;
  window.App.canAccessPage = canAccessPage;
  window.App.ROLES = ROLES;
})();
