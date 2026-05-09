const SUPABASE_URL = 'https://qwffnaeyniinnizrwnah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-I4fFFUkpKLwjg7vGX9f6A_e5keGT8H';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isLogin = false;

const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authBtn = document.getElementById('authBtn');
const switchText = document.getElementById('switchText');
const switchLink = document.getElementById('switchLink');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('errorMsg');

switchLink.addEventListener('click', (e) => {
  e.preventDefault();
  isLogin = !isLogin;
  errorMsg.style.display = 'none';
  
  if (isLogin) {
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Log in to your betterr account.';
    authBtn.textContent = 'Log In';
    switchText.textContent = "Don't have an account?";
    switchLink.textContent = 'Sign Up';
  } else {
    authTitle.textContent = 'Create Account';
    authSubtitle.textContent = 'Join betterr for free.';
    authBtn.textContent = 'Sign Up';
    switchText.textContent = 'Already have an account?';
    switchLink.textContent = 'Log In';
  }
});

authBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Please enter both email and password.");
    return;
  }

  authBtn.textContent = 'Please wait...';
  authBtn.disabled = true;

  let result;
  
  if (isLogin) {
    result = await supabaseClient.auth.signInWithPassword({ email, password });
  } else {
    result = await supabaseClient.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin + '/dashboard.html'
      }
    });
  }

  authBtn.disabled = false;
  authBtn.textContent = isLogin ? 'Log In' : 'Sign Up';

  if (result.error) {
    showError(result.error.message);
  } else {
    if (!isLogin && !result.data.session) {
      showError("Check your email to confirm your account!");
      errorMsg.style.background = "rgba(16, 185, 129, 0.1)";
      errorMsg.style.borderColor = "rgba(16, 185, 129, 0.2)";
      errorMsg.style.color = "#10b981";
    } else {
      window.location.href = 'dashboard.html';
    }
  }
});

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
  errorMsg.style.background = "rgba(239, 68, 68, 0.1)";
  errorMsg.style.borderColor = "rgba(239, 68, 68, 0.2)";
  errorMsg.style.color = "#ef4444";
}

// Check if already logged in
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    window.location.href = 'dashboard.html';
  }
});
