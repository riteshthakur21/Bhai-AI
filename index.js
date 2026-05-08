require("dotenv").config();
const readline = require("readline");
const BhaiAgent = require("./agent");
const { initWhatsApp } = require("./tools/whatsapp");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const bhai = new BhaiAgent();
const conversationHistory = [];

function askInput(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function startChat() {
  console.log("Bhai ready hai! Bol kya karna hai 😎");
  console.log("Bahar nikalne ke liye 'exit' ya 'bye' likh de bhai.\n");

   console.log("WhatsApp connect ho raha hai, ek second bhai...");
  try {
    await initWhatsApp();
  } catch (err) {
    console.log(`WhatsApp connect nahi hua: ${err.message}`);
  }

  while (true) {
    try {
      const userInput = (await askInput("Tu: ")).trim();
      if (!userInput) {
        continue;
      }

      if (/^(exit|quit|bye|band kar)$/i.test(userInput)) {
        console.log("Theek hai bhai, milte hain! 👋");
        rl.close();
        process.exit(0);
      }

      conversationHistory.push({ role: "user", text: userInput });
      console.log("Sooch raha hu...");

      // History RAM me rakhi ja rahi hai taaki same session context bana rahe.
      const reply = await bhai.handleInput(userInput, conversationHistory);
      conversationHistory.push({ role: "assistant", text: reply });

      console.log(`Bhai: ${reply}\n`);
    } catch (error) {
      console.error(`Arre bhai kuch gadbad ho gayi! ${error.message}\n`);
    }
  }
}

startChat().catch((error) => {
  console.error(`Arre bhai startup mein issue aa gaya: ${error.message}`);
  rl.close();
  process.exit(1);
});
