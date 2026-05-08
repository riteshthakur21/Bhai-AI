const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

let client = null;
let isReady = false;
let initPromise = null;

function getClient() {
  if (client) {
    return client;
  }

  client = new Client({
    authStrategy: new LocalAuth({ clientId: "bhai-session" }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
  });

  client.on("qr", (qr) => {
    console.log("\nWhatsApp login ke liye QR scan kar bhai:");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    isReady = true;
    console.log("WhatsApp connected hai bhai! ✅");
  });

  client.on("authenticated", () => {
    console.log("WhatsApp auth ho gaya bhai.");
  });

  client.on("auth_failure", (msg) => {
    isReady = false;
    console.error(`Arre bhai WhatsApp auth fail ho gaya: ${msg}`);
  });

  client.on("disconnected", (reason) => {
    isReady = false;
    console.error(`Arre bhai WhatsApp disconnect ho gaya: ${reason}`);
  });

  return client;
}

async function initWhatsApp() {
  try {
    // Ek hi client ko session bhar reuse karte hain.
    if (isReady) {
      return getClient();
    }

    if (!initPromise) {
      const instance = getClient();
      initPromise = new Promise((resolve, reject) => {
        const onReady = () => {
          cleanup();
          resolve(instance);
        };
        const onFail = (err) => {
          cleanup();
          reject(new Error(`Arre bhai WhatsApp start nahi hua: ${err}`));
        };
        const cleanup = () => {
          instance.removeListener("ready", onReady);
          instance.removeListener("auth_failure", onFail);
        };

        instance.once("ready", onReady);
        instance.once("auth_failure", onFail);
      });

      instance.initialize().catch((err) => {
        initPromise = null;
        throw err;
      });
    }

    return await initPromise;
  } catch (error) {
    throw new Error(`Arre bhai WhatsApp initialize mein gadbad: ${error.message}`);
  }
}

function findBestContact(contacts, contactName) {
  const target = contactName.trim().toLowerCase();
  return contacts.find((c) => {
    const pushName = (c.pushname || "").toLowerCase();
    const name = (c.name || "").toLowerCase();
    const number = (c.number || "").toLowerCase();
    return pushName.includes(target) || name.includes(target) || number.includes(target);
  });
}

async function sendMessage(contactName, message) {
  try {
    if (!contactName || !message) {
      throw new Error("contact aur message dono dena padega bhai.");
    }

    const waClient = await initWhatsApp();
    const contacts = await waClient.getContacts();
    const contact = findBestContact(contacts, contactName);

    if (!contact) {
      throw new Error(`${contactName} naam ka contact nahi mila.`);
    }

    await waClient.sendMessage(contact.id._serialized, message);
    return `Bhej diya bhai! ✅ ${contactName} ko message chala gaya.`;
  } catch (error) {
    throw new Error(`Arre bhai message bhejne mein gadbad: ${error.message}`);
  }
}

async function sendFile(contactName, filePath, caption = "") {
  try {
    if (!contactName || !filePath) {
      throw new Error("contact aur filePath dena zaroori hai bhai.");
    }

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`file nahi mili: ${absolutePath}`);
    }

    const waClient = await initWhatsApp();
    const contacts = await waClient.getContacts();
    const contact = findBestContact(contacts, contactName);

    if (!contact) {
      throw new Error(`${contactName} naam ka contact nahi mila.`);
    }

    const media = MessageMedia.fromFilePath(absolutePath);
    await waClient.sendMessage(contact.id._serialized, media, { caption });

    return `File bhej di bhai! ✅ ${contactName} ko file chali gayi.`;
  } catch (error) {
    throw new Error(`Arre bhai file bhejne mein gadbad: ${error.message}`);
  }
}

module.exports = {
  initWhatsApp,
  sendMessage,
  sendFile
};
