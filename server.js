// bhai-ai/server.js
require("dotenv").config();
const express = require("express");
const { initWhatsApp, sendMessage } = require("./tools/whatsapp");

const app = express();
app.use(express.json());

app.post("/send", async (req, res) => {
  const { contact, message } = req.body;
  if (!contact || !message)
    return res.status(400).json({ error: "contact aur message dono chahiye" });
  try {
    const result = await sendMessage(contact, message);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3001, async () => {
  console.log("WhatsApp server chal raha hai port 3001 pe 🚀");
  await initWhatsApp();
});