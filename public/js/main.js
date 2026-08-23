// Main homepage script
document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
});

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
