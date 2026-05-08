# Bhai AI

Bhai AI is a Node.js Hinglish assistant that combines chat with practical actions like WhatsApp messaging, browser search/open/screenshot, and PDF summarization.

## What this project currently does

- **Chat assistant (`agent.js`)** with intent detection for Hinglish commands.
- **CLI mode (`index.js`)** for interactive terminal conversations.
- **HTTP mode (`server.js`)** with a `/send` endpoint for WhatsApp message sending.
- **Tool modules (`tools/`)**:
  - `whatsapp.js`: WhatsApp Web connection, contact lookup, message/file sending.
  - `browser.js`: DuckDuckGo search, open URL, screenshot capture with Puppeteer.
  - `fileReader.js`: PDF text extraction + summary via Groq.

## Requirements

- Node.js 18+ recommended
- Google Chrome installed (used by Puppeteer with Windows Chrome path)
- A valid **Groq API key** in `.env`
- WhatsApp QR login on first run
- system controle
## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

## Run

### CLI assistant

```bash
npm start
```

Exit commands: `exit`, `quit`, `bye`, `band kar`

### HTTP server (WhatsApp send API)

```bash
node server.js
```

Server runs on `http://localhost:3001` with:

- `POST /send`
- Body:

```json
{
  "contact": "Rahul",
  "message": "Hello bhai"
}
```

## Example Hinglish commands

- `Rahul ko "kal milte hain" bhej`
- `chrome pe IPL search karo`
- `google.com open kar`
- `screenshot lo github.com`
- `notes.pdf summarize kar`

## Project structure

```text
bhai-ai/
├─ agent.js
├─ index.js
├─ server.js
├─ check.js
├─ tools/
│  ├─ whatsapp.js
│  ├─ browser.js
│  └─ fileReader.js
└─ screenshots/
```

## Notes

- The project uses session persistence for WhatsApp auth (`.wwebjs_auth`).
- Screenshots are saved in `screenshots/`.
- `check.js` appears to be a standalone model-check script and is not part of `npm start`.
