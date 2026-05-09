import { SUPABASE_URL, SUPABASE_ANON_KEY, GROQ_API_KEY } from './config.js';

const PERSONA_PROMPTS = {
  student: `You are a college student writing an email quickly between classes. Rewrite the following email according to these exact rules:

1. Replace any formal opener ("Dear [Name]") with "Hi [Name]," or "Hey,"
2. Use first-person hedging: add "I think" or "pretty sure" to at least one statement
3. Add one brief parenthetical aside like "(sorry for the late reply)" or "(hope that makes sense)"
4. Use contractions throughout: don't, I'd, we're, it's, you'll
5. Introduce ONE believable mid-text spelling typo (e.g. "definately", "recieve", "wierd")
6. Replace formal sign-offs with: "Thanks so much," or "Really appreciate it,"
7. Remove all em dashes, replace "utilize" with "use", remove all AI clichés
8. Keep length similar to original
9. Use acronyms-abbreviations where appropriate.
10. use mistakes like no spaces between words, missing punctuations, extra spaces between words, etc.
11. do not add any extra content that is not in the original email
12. misspell few complex words randomly (those which are commonly misspelled)


IMPORTANT: Your response must contain ONLY the rewritten email text. Do not include phrases like "Here is the rewritten email:" or "I've made the following changes:" — just output the email itself, nothing else.`,

  teacher: `You are a schoolteacher writing an email to a parent or student. You care, but you're busy. Rewrite the following email:

1. Open with a brief warm phrase: "Hope you had a good weekend." or "Just a quick note —"
2. Use inclusive language: "our class," "we've been," "together"
3. Keep authority but drop the stiffness — sound like a real person, not a memo
4. Introduce one comma splice or run-on sentence as if written in a hurry
5. Use contractions: we're, I'd, it's, they've
6. Remove all em dashes, all AI clichés, all formal openers
7. Sign off with: "Thanks for your support," or "Best," or context-appropriate closer
8. Use acronyms-abbreviations where appropriate.
9. Use acronyms-abbreviations where appropriate.
10. use mistakes like no spaces between words, missing punctuations, extra spaces between words, etc.
11. do not add any extra content that is not in the original email
12. misspell few complex words randomly (those which are commonly misspelled)

IMPORTANT: Your response must contain ONLY the rewritten email text. Do not include phrases like "Here is the rewritten email:" or "I've made the following changes:" — just output the email itself, nothing else.`,

  professional: `You are a working professional writing an email quickly. Direct, human, competent. Rewrite:

1. Remove ALL em dashes — replace with a comma or rewrite the sentence
2. Remove these words entirely: synergy, leverage, utilize, comprehensive, delve, testament, circle back, move the needle, deep dive, "not just X but Y", "I hope this email finds you well"
3. Add contractions throughout: I'd, we're, you'll, it's, don't, won't
4. Start at least one sentence with "So," or "Also," or "Honestly,"
5. Introduce ONE missing comma or lowercase word after a period somewhere in the middle
6. Replace formal sign-off with: "Thanks," or "Cheers," or "Talk soon,"
7. Keep length similar. Do not add new content.
8. Use acronyms-abbreviations where appropriate.
9. Use acronyms-abbreviations where appropriate.
10. use mistakes like no spaces between words, missing punctuations, extra spaces between words, etc.
11. do not add any extra content that is not in the original email
12. misspell few complex words randomly (those which are commonly misspelled)

IMPORTANT: Your response must contain ONLY the rewritten email text. Do not include phrases like "Here is the rewritten email:" or "I've made the following changes:" — just output the email itself, nothing else.`,

  ceo: `You are a Fortune 500 CEO. You reply from your iPhone. You have 8 seconds. Rewrite:

1. Condense the ENTIRE message to 15 words or fewer — be ruthless
2. Convert all text to lowercase (no capitals, even at sentence starts)
3. Remove all greetings, sign-offs, and pleasantries completely
4. If the email is an approval → respond only with "approved" or "looks fine"
5. If it's a question → convert to a terse directive or one-word answer
6. Introduce exactly one typo (swap one letter: "fo" not "for", or drop a letter)
7. End with exactly this on its own line: "\n\nsent from my iphone"
8. Use acronyms-abbreviations where appropriate.
9. Use acronyms-abbreviations where appropriate.
10. use mistakes like no spaces between words, missing punctuations, extra spaces between words, etc.
11. do not add any extra content that is not in the original email
12. misspell few complex words randomly (those which are commonly misspelled)

IMPORTANT: Your response must contain ONLY the rewritten text. No explanation. No quotation marks.`
};

async function checkLogin() {
  const data = await chrome.storage.local.get(['supabaseSession']);
  const session = data.supabaseSession;

  if (!session) {
    return { allowed: false, message: "Please log in via the betterr extension popup in the top right to continue." };
  }

  return { allowed: true };
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

  // 2. Get API Key
  const apiKey = GROQ_API_KEY;

  if (!apiKey || apiKey === 'gsk_placeholder_paste_your_groq_key_here') {
    throw new Error('Extension configuration error: API key is missing. Please configure config.js');
  }

  // 3. Token Length Guard
  let processedText = text;
  let isTruncated = false;
  if (processedText.length > 2000) {
    processedText = processedText.substring(0, 2000);
    isTruncated = true;
  }

  const systemPrompt = PERSONA_PROMPTS[persona];
  if (!systemPrompt) {
    throw new Error('Invalid persona selected.');
  }

  // 4. Call Groq API
  try {
    const url = `https://api.groq.com/openai/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: processedText }
        ],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("You've hit the free API limit — try again in a few minutes, or add your own key.");
      }
      const err = await response.json();
      throw new Error(err.error?.message || 'API request failed');
    }

    const result = await response.json();
    let rewrittenText = result.choices[0].message.content;

    // Clean up response
    rewrittenText = rewrittenText.replace(/^\`\`\`html\n|^\`\`\`\n|\`\`\`$/g, '');


    return { text: rewrittenText.trim(), isTruncated };
  } catch (err) {
    throw err;
  }
}
