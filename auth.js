

// FORM MODE MANAGEMENT (Login/Signup Toggle)

const authToggle = document.getElementById('authToggle');
const toggleText = document.getElementById('toggleText');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const submitBtn = document.getElementById('submitBtn');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const confirmPasswordInput = document.getElementById('confirmPassword');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

let currentMode = 'login';

function toggleMode() {
  if (currentMode === 'login') {
    switchToSignup();
  } else {
    switchToLogin();
  }
}


// Switch to login mode
function switchToLogin() {
  currentMode = 'login';

  toggleText.textContent = 'Sign up';


  formTitle.textContent = 'Welcome back';
  formSubtitle.textContent = 'Sign in to continue to your boards';
  submitBtn.textContent = 'Sign in';
  confirmPasswordGroup.style.display = 'none';
  confirmPasswordInput.removeAttribute('required');

  forgotPasswordLink.style.display = 'flex';
}

// Switch to signup mode
function switchToSignup() {
  currentMode = 'signup';

  toggleText.textContent = 'Sign in';


  formTitle.textContent = 'Create your account';
  formSubtitle.textContent = 'Start organizing your projects with Slate';
  submitBtn.textContent = 'Create account';

  confirmPasswordGroup.style.display = 'block';
  confirmPasswordInput.setAttribute('required', 'required');
  forgotPasswordLink.style.display = 'none';
}

authToggle.addEventListener('click', toggleMode);


// FORM VALIDATION

const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password.length >= 8;
}
function clearError(errorElement, inputElement) {
  errorElement.textContent = '';
  if (inputElement) {
    inputElement.classList.remove('error');
  }
}

function showError(errorElement, message, inputElement) {
  errorElement.textContent = message;
  if (inputElement) {
    inputElement.classList.add('error');
  }
}

authForm.addEventListener('submit', (e) => {
  e.preventDefault();

  clearError(emailError, emailInput);
  clearError(passwordError, passwordInput);
  clearError(confirmPasswordError, confirmPasswordInput);

  let isValid = true;

  const email = emailInput.value.trim();
  if (!email) {
    showError(emailError, '* Cannot be left blank', emailInput);
    isValid = false;
  } else if (!validateEmail(email)) {
    showError(emailError, '* Invalid email address', emailInput);
    isValid = false;
  }

  const password = passwordInput.value;
  if (!password) {
    showError(passwordError, '* Cannot be left blank', passwordInput);
    isValid = false;
  } else if (currentMode === 'signup' && !validatePassword(password)) {
    showError(passwordError, '* Password must be at least 8 characters', passwordInput);
    isValid = false;
  }

  if (currentMode === 'signup') {
    const confirmPassword = confirmPasswordInput.value;
    if (!confirmPassword) {
      showError(confirmPasswordError, '* Cannot be left blank', confirmPasswordInput);
      isValid = false;
    } else if (password !== confirmPassword) {
      showError(confirmPasswordError, '* Passwords do not match', confirmPasswordInput);
      isValid = false;
    }
  }

  if (isValid) {
    handleFormSubmit(email, password);
  }
});
function handleFormSubmit(email, password) {
  console.log(`${currentMode === 'login' ? 'Login' : 'Signup'} attempt:`, { email });

  localStorage.setItem('slate-user-email', email);

  window.location.href = 'dashboard.html';
}

emailInput.addEventListener('blur', () => {
  const email = emailInput.value.trim();
  if (email && !validateEmail(email)) {
    showError(emailError, '* Invalid email address', emailInput);
  } else {
    clearError(emailError, emailInput);
  }
});

passwordInput.addEventListener('blur', () => {
  const password = passwordInput.value;
  if (currentMode === 'signup' && password && !validatePassword(password)) {
    showError(passwordError, '* Password must be at least 8 characters', passwordInput);
  } else {
    clearError(passwordError, passwordInput);
  }
});

confirmPasswordInput.addEventListener('blur', () => {
  if (currentMode === 'signup') {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (confirmPassword && password !== confirmPassword) {
      showError(confirmPasswordError, '* Passwords do not match', confirmPasswordInput);
    } else {
      clearError(confirmPasswordError, confirmPasswordInput);
    }
  }
});

// GOOGLE OAUTH (Placeholder)

const googleBtn = document.getElementById('googleBtn');

googleBtn.addEventListener('click', () => {
  console.log('Google OAuth clicked (Demo mode)');
  alert('Google OAuth integration would happen here. (Demo mode)');
});

// KEYBOARD SHORTCUTS



document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    authForm.reset();
    clearError(emailError);
    clearError(passwordError);
    clearError(confirmPasswordError);
  }
});

// ACCESSIBILITY ENHANCEMENTS


authToggle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleMode();
  }
});

// LOGO INTERACTIVITY

const logoButton = document.getElementById('logoButton');

logoButton.addEventListener('click', () => {
  window.location.reload();
});

document.addEventListener('DOMContentLoaded', () => {
  switchToLogin();
});
