const Groq = require("groq-sdk");
const whatsappTool = require("./tools/whatsapp");
const browserTool = require("./tools/browser");
const fileReaderTool = require("./tools/fileReader");

class BhaiAgent {
  constructor() {
    this.systemPrompt = `You are Bhai, a casual Hinglish AI assistant. You talk like a desi best friend — mix Hindi and English naturally, be funny, helpful and direct.

IMPORTANT RULES:
- Always reply in Hinglish (Hindi + English mix)
- Never say you sent a WhatsApp message or did a browser search yourself — that is handled by tools
- If user asks something you don't know, admit it casually
- End some responses with "bhai" naturally
- Be concise, not too long`;

    this.groqKey = process.env.GROQ_API_KEY;
    this.groq = null;
    this.history = [];

    if (this.groqKey) {
      this.groq = new Groq({ apiKey: this.groqKey });
    }
  }

  detectIntent(userInput) {
    const text = userInput.trim();
    const lower = text.toLowerCase();

    // ─── COMPOUND: Search + Screenshot ─────────────────────────────
    // "ipl search karo aur screenshot lo"
    const compoundMatch =
      text.match(/(.+?)\s+(?:search|dhundh)\s*(?:kar|karo|de|do)?\s+aur\s+(?:uske?\s+baad\s+)?(?:waha\s+ka\s+)?screenshot/i) ||
      text.match(/(?:chrome|google|browser)\s+pe\s+(.+?)\s+search\s*(?:kar|karo)?\s+aur\s+screenshot/i);

    if (compoundMatch) {
      return {
        intent: "browser_search_screenshot",
        query: compoundMatch[1].trim()
      };
    }

    // ─── WhatsApp MESSAGE ───────────────────────────────────────────
    // Formats supported:
    // "Rahul ko "hello" bhej"
    // "Rahul ko msg kar hello"
    // "9876543210 pe "hi" bhej de"
    const msgMatch =
      text.match(/^(.+?)\s+ko\s+[""](.+?)[""]\s*(?:bhej|send|msg|de|dena|do)?/i) ||
      text.match(/^(.+?)\s+ko\s+(?:msg|message)\s+(?:bhej|kar|de|dena|do|karo)\s+[""]?(.+?)[""]?$/i) ||
      text.match(/^(.+?)\s+ko\s+(?:bol|bolo|batao)\s+[""]?(.+?)[""]?$/i) ||
      text.match(/^(\d{10,})\s+(?:number\s+)?(?:pe|par)\s+[""]?(.+?)[""]?\s+(?:bhej|send|de|dena)/i) ||
      text.match(/^(?:msg|message)\s+(?:bhej|karo|kar)\s+(.+?)\s+ko\s+[""]?(.+?)[""]?$/i);

    if (msgMatch) {
      const contact = msgMatch[1].trim();
      const message = msgMatch[2].trim();
      // Avoid false positive — agar contact bahut lamba ho toh skip
      if (contact.length < 50 && message.length > 0) {
        return { intent: "whatsapp_message", contactName: contact, message };
      }
    }

    // ─── WhatsApp FILE ──────────────────────────────────────────────
    const fileMatch = text.match(
      /^(.+?)\s+ko\s+(.+\.(?:pdf|png|jpg|jpeg|webp|mp4|mov|mkv|zip|docx))\s+(?:bhej|send|de)/i
    );
    if (fileMatch) {
      return {
        intent: "whatsapp_file",
        contactName: fileMatch[1].trim(),
        filePath: fileMatch[2].trim(),
        caption: ""
      };
    }

    // ─── BROWSER SEARCH ─────────────────────────────────────────────
    // Formats: "ipl search kar", "chrome pe ipl search karo",
    //          "google pe ipl dhundh", "search kar ipl kya hai"
    const searchMatch =
      text.match(/(?:chrome|google|browser)\s+pe\s+(.+?)\s+(?:search|dhundh)\s*(?:kar|karo|de|do)?/i) ||
      text.match(/^(.+?)\s+(?:search|dhundh)\s+(?:kar|karo|de|do)$/i) ||
      text.match(/^(?:search|dhundh)\s+(?:kar|karo)?\s+(.+)$/i) ||
      text.match(/^(.+?)\s+(?:ke\s+bare\s+mein|baare\s+mein)\s+(?:search|dhundh|batao|bata)\s*(?:kar|karo)?/i);

    if (searchMatch) {
      const query = (searchMatch[1] || searchMatch[2] || "").trim();
      if (query.length > 1) {
        return { intent: "browser_search", query };
      }
    }

    // ─── BROWSER OPEN URL ───────────────────────────────────────────
    // Formats: "google.com khol de", "youtube.com open kar",
    //          "chrome pe youtube.com khol"
    const openMatch =
      text.match(/(?:chrome|browser)\s+pe\s+(?:open|khol|kholna|kholo)\s+(\S+)/i) ||
      text.match(/^(\S+\.\S+)\s+(?:khol|open|kholna|kholo|de|do)\s*(?:de|do|kar|bhai)?$/i) ||
      text.match(/^(?:khol|open)\s+(\S+\.\S+)/i);

    if (openMatch) {
      return { intent: "browser_open", url: openMatch[1].trim() };
    }

    // ─── SCREENSHOT ─────────────────────────────────────────────────
    const screenshotMatch = text.match(
      /(?:screenshot|screen\s*shot)\s+(?:lo|le|lena|nikal|nikalo)\s+(\S+)/i
    );
    if (screenshotMatch) {
      return { intent: "browser_screenshot", url: screenshotMatch[1].trim() };
    }

    // ─── FILE READ ──────────────────────────────────────────────────
    const fileReadMatch = text.match(/([^\s]+\.(?:pdf|png|jpg|jpeg|webp))/i);
    if (/(padh|read|summarize|summary|describe|samjha|bata)/i.test(lower) && fileReadMatch) {
      return { intent: "file_read", filePath: fileReadMatch[1].trim() };
    }

    // ─── DEFAULT ────────────────────────────────────────────────────
    return { intent: "normal_chat" };
  }

  async safeGeminiReply(prompt) {
    if (!this.groq) {
      throw new Error("GROQ_API_KEY missing hai bhai, .env set kar.");
    }

    const messages = [
      { role: "system", content: this.systemPrompt },
      ...this.history,
      { role: "user", content: prompt }
    ];

    const result = await this.groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.75,
      max_tokens: 1024,
      messages
    });

    const reply =
      result?.choices?.[0]?.message?.content?.trim() || "Bhai reply blank aa gaya.";

    this.history.push({ role: "user", content: prompt });
    this.history.push({ role: "assistant", content: reply });

    // Context window limit
    if (this.history.length > 40) {
      this.history = this.history.slice(-40);
    }

    return reply;
  }

  async handleInput(userInput) {
    try {
      const parsed = this.detectIntent(userInput);

      switch (parsed.intent) {
        case "whatsapp_message":
          return await whatsappTool.sendMessage(parsed.contactName, parsed.message);

        case "whatsapp_file":
          return await whatsappTool.sendFile(parsed.contactName, parsed.filePath, parsed.caption);

        case "browser_search":
          return await browserTool.searchGoogle(parsed.query);

        case "browser_search_screenshot":
          return await browserTool.searchAndScreenshot(parsed.query);

        case "browser_open":
          return await browserTool.openUrl(parsed.url);

        case "browser_screenshot":
          return await browserTool.takeScreenshot(parsed.url);

        case "file_read":
          return await fileReaderTool.readFile(parsed.filePath);

        case "normal_chat":
        default:
          return await this.safeGeminiReply(userInput);
      }
    } catch (error) {
      return `Arre bhai kuch gadbad ho gayi! ${error.message}`;
    }
  }
}

module.exports = BhaiAgent;