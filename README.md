# betterr

We are tired of overly polished AI-generated emails. You know the kind—stuffed with em-dashes and phrases like "delve into" or "it's not this, it's that." We can all immediately spot them. 

**betterr** is built as an "anti-Grammarly". It is an AI tool designed to help you write emails that sound like an *actual human wrote them*. Sometimes that means leaving in subtle imperfections, drastically shortening phrases, and removing the corporate filler that AI usually adds.

When we tested the "CEO" mode by messaging five Fortune 500 CEOs, we got four replies. Each was under 10 words, and one even addressed us by the wrong name. True human writing isn't always perfectly polished. And honestly, we'd rather read messages like that over the tons of AI-generated DMs we get every day.

## Modes
The tool currently intercepts your text boxes and provides a one-click way to rewrite drafts using Groq's high-speed inference across three modes:
- **Subtle**: Eliminates filler words and shortens phrases.
- **Human**: Goes a step further by making your message genuinely conversational and grounded.
- **CEO**: Frames your message aggressively to the point, communicating exactly how tech CEOs do.

## Features
- **Seamless Injection**: Places a minimal, non-intrusive action button directly into Gmail compose windows and LinkedIn message boxes.
- **Topographical Design**: Built with the *Meridian Geo* theme—featuring deep dark aesthetics (`#0A0D08`), glassmorphism, and a high-performance WebGL topographic map background.
- **Instant Rewrites**: Powered by Groq to generate refined drafts with near-zero latency.
- **Side-by-side Diff**: Changes to your text are highlighted instantly so you know exactly what the model adjusted.

## Tech Stack
- **Frontend**: Vanilla JS/HTML/CSS (Zero dependencies, keeping the extension extremely fast).
- **Backend/Auth**: Supabase (Handles user sessions and protects API usage).
- **AI Inference**: Groq API.

## Installation (Developer Mode)
Since this extension isn't on the Chrome Web Store yet, you can run it locally:
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing these files.
5. The extension is now active. Open Gmail or LinkedIn to see it in action.
