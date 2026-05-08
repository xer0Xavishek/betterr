import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('loginForm');
  const loggedInState = document.getElementById('loggedInState');
  const userEmailEl = document.getElementById('userEmail');
  const authStatusEl = document.getElementById('authStatusMessage');

  chrome.storage.local.get(['supabaseSession'], (result) => {
    if (result.supabaseSession) {
      updateAuthUI(result.supabaseSession);
    } else {
      showLoginForm();
    }
  });

  function showStatus(el, message, isError = false) {
    el.textContent = message;
    el.className = 'status-message ' + (isError ? 'error' : 'success');
    el.style.display = 'block';
  }

  async function supabaseAuth(endpoint, body) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || data.msg || 'Auth failed');
    return data;
  }

  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return showStatus(authStatusEl, 'Email and password required', true);
    
    showStatus(authStatusEl, 'Logging in...', false);
    try {
      const data = await supabaseAuth('token?grant_type=password', { email, password });
      chrome.storage.local.set({ supabaseSession: data }, () => {
        updateAuthUI(data);
        showStatus(authStatusEl, 'Logged in!', false);
        setTimeout(() => { authStatusEl.style.display = 'none'; }, 2000);
      });
    } catch (err) {
      showStatus(authStatusEl, err.message, true);
    }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['supabaseSession'], () => {
      showLoginForm();
      showStatus(authStatusEl, 'Logged out', false);
      setTimeout(() => { authStatusEl.style.display = 'none'; }, 2000);
    });
  });

  function updateAuthUI(session) {
    loginForm.style.display = 'none';
    loggedInState.style.display = 'block';
    userEmailEl.textContent = session.user.email;
  }

  function showLoginForm() {
    loginForm.style.display = 'block';
    loggedInState.style.display = 'none';
  }
});
