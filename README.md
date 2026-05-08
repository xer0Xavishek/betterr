# betterr

A sleek, lightweight Chrome extension that integrates AI writing assistance directly into Gmail and LinkedIn. It intercepts your text boxes and gives you a one-click way to rewrite, refine, or expand your drafts using Groq's high-speed inference.

## Features

- **Seamless Injection**: Places a minimal, non-intrusive action button directly into Gmail compose windows and LinkedIn message boxes.
- **Topographical Design**: Built with the *Meridian Geo* theme—featuring deep dark aesthetics (`#0A0D08`), glassmorphism, and a high-performance WebGL topographic map background on the dashboard.
- **Instant Rewrites**: Powered by Groq to generate refined drafts with near-zero latency.
- **Side-by-side Diff**: Changes to your text are highlighted instantly so you know exactly what the model adjusted.

## Tech Stack

- **Frontend**: Vanilla JS/HTML/CSS (Zero dependencies, keeping the extension extremely fast).
- **Styling**: Custom CSS properties mapping to the Meridian Geo design token system.
- **Backend/Auth**: Supabase (Handles user sessions and protects API usage).
- **AI Inference**: Groq API.

## Installation (Developer Mode)

Since this extension isn't on the Chrome Web Store yet, you can run it locally:

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing these files.
5. The extension is now active. Open Gmail or LinkedIn to see it in action.

## Development

All extension UI logic lives in `content.js` and `linkedin_content.js`. The popup UI is handled by `popup.html`/`popup.js`. 
The companion website (used for authentication and the dashboard) is located in the `/website` directory.

### Website WebGL
The landing page and dashboard feature a custom WebGL shader. It uses 3D Simplex Noise layered via Fractal Brownian Motion (FBM) to render dynamic, pulsing topographic contour lines.

## License

MIT
