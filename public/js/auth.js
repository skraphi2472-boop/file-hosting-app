// Main authentication handler
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Check if user is logged in
  checkAuthStatus();
});

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorElement = document.getElementById('error-message');

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      window.location.href = '/dashboard';
    } else {
      const data = await response.json();
      errorElement.textContent = data.error || 'Login failed';
      errorElement.style.display = 'block';
    }
  } catch (error) {
    errorElement.textContent = 'Error: ' + error.message;
    errorElement.style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorElement = document.getElementById('error-message');

  if (password !== confirmPassword) {
    errorElement.textContent = 'Passwords do not match';
    errorElement.style.display = 'block';
    return;
  }

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, firstName, lastName, password })
    });

    if (response.ok) {
      window.location.href = '/login';
    } else {
      const data = await response.json();
      errorElement.textContent = data.error || 'Registration failed';
      errorElement.style.display = 'block';
    }
  } catch (error) {
    errorElement.textContent = 'Error: ' + error.message;
    errorElement.style.display = 'block';
  }
}

async function checkAuthStatus() {
  try {
    const response = await fetch('/auth/status');
    const data = await response.json();
    const authLinks = document.getElementById('auth-links');
    const userLinks = document.getElementById('user-links');
    const getStartedBtn = document.getElementById('get-started-btn');

    if (data.authenticated) {
      if (authLinks) authLinks.style.display = 'none';
      if (userLinks) userLinks.style.display = 'flex';
      if (getStartedBtn) getStartedBtn.href = '/dashboard';
    } else {
      if (authLinks) authLinks.style.display = 'flex';
      if (userLinks) userLinks.style.display = 'none';
      if (getStartedBtn) getStartedBtn.href = '/register';
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
  }
}
