const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function summarizePdf(absolutePath) {
  const buffer = await fs.readFile(absolutePath);
  const data = await pdfParse(buffer);
  const pdfText = (data.text || "").trim();

  if (!pdfText) {
    return "Bhai PDF mein readable text nahi mila.";
  }

  const truncated = pdfText.slice(0, 15000);
  const prompt = `Tu Bhai assistant hai. Neeche diye PDF notes ka concise Hinglish summary de. Main points, important concepts aur quick recap de.\n\n${truncated}`;

  const result = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }]
  });

  return result.choices[0].message.content.trim();
}

async function readFile(filePath) {
  try {
    if (!filePath) {
      throw new Error("file path dena padega bhai.");
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    await fs.access(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();

    if (ext === ".pdf") {
      const summary = await summarizePdf(absolutePath);
      return `Haan bhai, PDF padh liya. Ye summary hai:\n\n${summary}`;
    }

    if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      return "Bhai image reading abhi Groq mein support nahi hai — sirf PDF bhejo!";
    }

    throw new Error("Sirf PDF file padh sakta hu abhi bhai.");
  } catch (error) {
    throw new Error(`Arre bhai file padhne mein gadbad: ${error.message}`);
  }
}

module.exports = { readFile };