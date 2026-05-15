# Bhai AI (v1)

![Language](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)

## What is Bhai AI?

Bhai AI v1 ek **Node.js based Hinglish assistant** hai jo chat ke saath real actions bhi karta hai—jaise WhatsApp message/file bhejna, browser pe search/open/screenshot aur PDF summary nikalna. Matlab vibe desi, kaam practical.

## Features

- 💬 **Hinglish AI Chat** via Groq (`llama-3.3-70b-versatile`)
- 📲 **WhatsApp automation** (contact search + message send)
- 📎 **WhatsApp file send** (PDF/image/video/ZIP/DOCX patterns supported in parser)
- 🌐 **Browser search** on DuckDuckGo with top results extraction
- 🔗 **URL open + quick page preview**
- 📸 **Screenshot capture** (direct URL or search+first-result screenshot)
- 📄 **PDF summarize** via Groq
- 🧠 **Session chat memory** (recent history kept in runtime)
- 🧪 **Optional model check script** (`check.js`, standalone)

## Project Structure

```text
bhai-ai/
├─ agent.js                    # Main intent parser + router to tools + Groq chat
├─ index.js                    # CLI chat loop (interactive terminal entry point)
├─ server.js                   # Express API server exposing POST /send for WhatsApp
├─ check.js                    # Standalone Google Generative AI model listing script
├─ package.json                # Project metadata, scripts, and dependencies
├─ package-lock.json           # Dependency lockfile
├─ .gitignore                  # Ignore rules (env, node_modules, auth/cache, logs)
├─ .env                        # Local environment variables (not for git)
├─ tools/
│  ├─ whatsapp.js              # WhatsApp Web init/auth + send message/file
│  ├─ browser.js               # Puppeteer browser actions (search/open/screenshot)
│  └─ fileReader.js            # PDF parsing + summary (image returns unsupported msg)
├─ screenshots/                # Saved screenshots
└─ console.log(m.name)))       # Stray/empty log-named file (ignored by .gitignore)
```

## Prerequisites

1. Node.js 18+ (recommended)
2. npm
3. Google Chrome (for Puppeteer launch path on Windows)
4. Groq API key

**Dependencies (`package.json`)**

- dotenv
- express
- groq-sdk
- pdf-parse
- puppeteer
- qrcode-terminal
- whatsapp-web.js

## Installation & Setup

1. Install dependencies:

```bash
npm install
```

2. Create/update `.env` in project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

3. First run pe WhatsApp QR scan karna hoga (terminal mein QR aayega).

## How to Run

1. **CLI assistant (main app):**

```bash
npm start
```

2. **WhatsApp HTTP server (for API-style send):**

```bash
node server.js
```

Server endpoint: `POST http://localhost:3001/send`

```json
{
  "contact": "RiyaDi",
  "message": "Hi!"
}
```

## How to Use (Examples)

**WhatsApp**

- `RiyaDi ko "hi" bhej de`
- `9876543210 pe "kal call karna" bhej`
- `Aman ko report.pdf bhej`

**Browser**

- `chrome pe DSA search karo`
- `google.com khol de`
- `screenshot lo github.com`
- `IPL search karo aur screenshot lo`

**File reading**

- `notes.pdf summarize kar`
- `physics.pdf padh`

**Exit CLI**

- `exit` / `quit` / `bye` / `band kar`

## Tools & Tech Stack

| Tool | Purpose |
|---|---|
| Node.js | Runtime for assistant and API |
| Groq SDK | LLM chat + PDF summary generation |
| whatsapp-web.js | WhatsApp Web automation |
| Puppeteer | Browser automation + screenshots |
| Express | HTTP API (`/send`) |
| pdf-parse | PDF text extraction |
| qrcode-terminal | WhatsApp login QR in terminal |
| dotenv | Environment variable loading |

## Known Limitations

- Image summarization v1 mein implemented nahi hai (`fileReader.js` images reject karta hai).
- WhatsApp actions ke liye valid logged-in WhatsApp Web session required hai.
- Browser/search commands regex-driven hain; exact phrasing pe best work karta hai.
- `check.js` main workflow ka part nahi hai aur hardcoded API key placeholder use karta hai.

## Future Plans

- 🎙️ Native voice input/output integration
- 🖼️ Image understanding support in v1 file reader
- 🧩 Better intent coverage for more natural Hinglish phrasing
- 🔒 Stronger config validation and safer secret handling
