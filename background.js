import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

async function checkLogin() {
  const data = await chrome.storage.local.get(['supabaseSession']);
  const session = data.supabaseSession;

  if (!session) {
    return { allowed: false, message: "Please log in via the betterr extension popup in the top right to continue." };
  }

  return { allowed: true, session };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'HUMANIZE_TEXT') {
    handleHumanizeRequest(request.text, request.persona)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleHumanizeRequest(text, persona) {
  // 1. Check Login Status
  const authCheck = await checkLogin();
  if (!authCheck.allowed) {
    throw new Error(authCheck.message);
  }

  const session = authCheck.session;

  // 2. Call Supabase Edge Function
  try {
    const url = `${SUPABASE_URL}/functions/v1/humanize`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ text, persona })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("You've hit the rate limit. Please try again in a few minutes.");
      }
      const err = await response.json();
      throw new Error(err.error || 'Server request failed');
    }

    const result = await response.json();
    if (result.error) throw new Error(result.error);

    return { text: result.text, isTruncated: result.isTruncated };
  } catch (err) {
    throw err;
  }
}
