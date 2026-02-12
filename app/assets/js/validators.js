/**
 * Smart Scheduling System - Client-side validation
 * Email format, password rules, confirm password match.
 * Show errors inline and prevent submit.
 */

const Validators = {
  /**
   * Validate email format
   * @param {string} email
   * @returns {{ valid: boolean, message?: string }}
   */
  email(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, message: 'Email is required.' };
    }
    const trimmed = email.trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(trimmed)) {
      return { valid: false, message: 'Please enter a valid email address.' };
    }
    return { valid: true };
  },

  /**
   * Password: min 8 chars, 1 uppercase, 1 number
   * @param {string} password
   * @returns {{ valid: boolean, message?: string }}
   */
  password(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'Password is required.' };
    }
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number.' };
    }
    return { valid: true };
  },

  /**
   * Confirm password match
   * @param {string} password
   * @param {string} confirmPassword
   * @returns {{ valid: boolean, message?: string }}
   */
  confirmPassword(password, confirmPassword) {
    if (!confirmPassword || typeof confirmPassword !== 'string') {
      return { valid: false, message: 'Please confirm your password.' };
    }
    if (password !== confirmPassword) {
      return { valid: false, message: 'Passwords do not match.' };
    }
    return { valid: true };
  },

  /**
   * Show inline error for an input (Bootstrap form group)
   * @param {HTMLInputElement|HTMLElement} inputEl - input or form group
   * @param {string} message - error message
   */
  showError(inputEl, message) {
    const formGroup = inputEl.closest('.mb-3') || inputEl.closest('.form-group') || inputEl.parentElement;
    if (!formGroup) return;
    let feedback = formGroup.querySelector('.invalid-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      formGroup.appendChild(feedback);
    }
    feedback.textContent = message;
    feedback.style.display = 'block';
    const field = formGroup.querySelector('input, select, textarea');
    if (field) {
      field.classList.add('is-invalid');
    }
  },

  /**
   * Clear inline error for an input
   * @param {HTMLInputElement|HTMLElement} inputEl
   */
  clearError(inputEl) {
    const formGroup = inputEl.closest('.mb-3') || inputEl.closest('.form-group') || inputEl.parentElement;
    if (!formGroup) return;
    const feedback = formGroup.querySelector('.invalid-feedback');
    if (feedback) feedback.style.display = 'none';
    const field = formGroup.querySelector('input, select, textarea');
    if (field) field.classList.remove('is-invalid');
  },

  /**
   * Clear all errors in a form
   * @param {HTMLFormElement} form
   */
  clearFormErrors(form) {
    if (!form) return;
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    form.querySelectorAll('.invalid-feedback').forEach((el) => { el.style.display = 'none'; });
  },

  /**
   * Validate login form (email + password)
   * @param {HTMLFormElement} form
   * @returns {{ valid: boolean, data?: { email: string, password: string } }}
   */
  validateLoginForm(form) {
    Validators.clearFormErrors(form);
    const emailEl = form.querySelector('[name="email"]');
    const passwordEl = form.querySelector('[name="password"]');
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';

    let valid = true;
    const emailResult = Validators.email(email);
    if (!emailResult.valid) {
      Validators.showError(emailEl, emailResult.message);
      valid = false;
    }
    if (!password) {
      Validators.showError(passwordEl, 'Password is required.');
      valid = false;
    } else {
      const passResult = Validators.password(password);
      if (!passResult.valid) {
        Validators.showError(passwordEl, passResult.message);
        valid = false;
      }
    }
    return valid ? { valid: true, data: { email, password } } : { valid: false };
  },

  /**
   * Validate registration form (email, password, confirmPassword, name, role if present)
   * @param {HTMLFormElement} form
   * @returns {{ valid: boolean, data?: object }}
   */
  validateRegisterForm(form) {
    Validators.clearFormErrors(form);
    const get = (name) => {
      const el = form.querySelector(`[name="${name}"]`);
      return el ? el.value : '';
    };
    const email = get('email').trim();
    const password = get('password');
    const confirmPassword = get('confirmPassword');
    const fullName = get('fullName').trim();

    let valid = true;
    const emailResult = Validators.email(email);
    if (!emailResult.valid) {
      Validators.showError(form.querySelector('[name="email"]'), emailResult.message);
      valid = false;
    }
    const passResult = Validators.password(password);
    if (!passResult.valid) {
      Validators.showError(form.querySelector('[name="password"]'), passResult.message);
      valid = false;
    }
    const confirmResult = Validators.confirmPassword(password, confirmPassword);
    if (!confirmResult.valid) {
      Validators.showError(form.querySelector('[name="confirmPassword"]'), confirmResult.message);
      valid = false;
    }
    if (fullName.length < 2) {
      Validators.showError(form.querySelector('[name="fullName"]'), 'Full name must be at least 2 characters.');
      valid = false;
    }

    if (!valid) return { valid: false };
    return {
      valid: true,
      data: { email, password, fullName, role: get('role') || 'CLIENT' },
    };
  },
};

// Export for use in other scripts (global in vanilla context)
if (typeof window !== 'undefined') {
  window.Validators = Validators;
}
