const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

let browser = null;
let activePage = null; // Current open page — close nahi karte turant

// Windows Chrome path
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// ─── BROWSER INSTANCE ────────────────────────────────────────────────────────
async function getBrowser() {
  try {
    if (browser && browser.connected) {
      return browser;
    }

    browser = await puppeteer.launch({
      headless: false,
      executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
      args: [
        "--start-maximized",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled", // bot detection bypass
        "--disable-infobars",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });

    // Automation banner hide karo
    browser.on("targetcreated", async (target) => {
      const p = await target.page().catch(() => null);
      if (p) {
        await p.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        }).catch(() => {});
      }
    });

    browser.on("disconnected", () => {
      browser = null;
      activePage = null;
      console.log("Browser band ho gaya bhai.");
    });

    return browser;
  } catch (error) {
    throw new Error(`Arre bhai browser start nahi hua: ${error.message}`);
  }
}

// ─── GET OR CREATE A PAGE ────────────────────────────────────────────────────
async function getPage() {
  const instance = await getBrowser();

  // Purani page reuse karo ya nayi banao
  if (activePage && !activePage.isClosed()) {
    return activePage;
  }

  activePage = await instance.newPage();

  // Realistic user agent
  await activePage.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );

  // Webdriver property hide
  await activePage.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  return activePage;
}

// ─── URL NORMALIZE ───────────────────────────────────────────────────────────
function normalizeUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

// ─── SEARCH ──────────────────────────────────────────────────────────────────
async function searchGoogle(query) {
  try {
    if (!query) throw new Error("Search query deni padegi bhai.");

    const page = await getPage();
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3000));

    const topResults = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid="result"]'));
      return cards.slice(0, 3).map((card) => {
        const title = card.querySelector("h2")?.innerText?.trim() || "";
        // Real URL — data-href ya og:url se nikalo, DDG redirect nahi
        const anchor = card.querySelector('a[data-testid="result-title-a"]') ||
                       card.querySelector("h2 a") ||
                       card.querySelector("a");
        const rawHref = anchor?.href || "";
        // DDG redirect URL se actual URL extract karo
        let link = rawHref;
        try {
          if (rawHref.includes("duckduckgo.com/l/?")) {
            const u = new URL(rawHref);
            link = decodeURIComponent(u.searchParams.get("uddg") || rawHref);
          }
        } catch (_) {}
        const snippet =
          card.querySelector('[data-result="snippet"]')?.innerText?.trim() || "";
        if (!title) return null;
        return { title, link, snippet };
      }).filter(Boolean);
    });

    if (!topResults.length) {
      return `Bhai results nahi mile "${query}" ke liye. Browser mein dekh le.`;
    }

    const formatted = topResults
      .map((r, i) => `${i + 1}. ${r.title}\n   🔗 ${r.link}\n   ${r.snippet || ""}`)
      .join("\n\n");

    return `Le bhai, "${query}" ke top results:\n\n${formatted}`;
  } catch (error) {
    if (error.message.includes("detached") || error.message.includes("closed")) {
      activePage = null;
    }
    throw new Error(`Arre bhai search mein gadbad: ${error.message}`);
  }
}

// ─── SEARCH + SCREENSHOT (compound command) ──────────────────────────────────
async function searchAndScreenshot(query) {
  let screenshotPage;
  try {
    if (!query) throw new Error("Query deni padegi bhai.");

    // Step 1: Search karo
    const searchResult = await searchGoogle(query);

    // Step 2: Pehla result URL nikalo
    const urlMatch = searchResult.match(/🔗 (https?:\/\/[^\n]+)/);
    if (!urlMatch) {
      return `${searchResult}\n\nScreenshot nahi le saka bhai — URL nahi mila results mein.`;
    }

    const targetUrl = urlMatch[1].trim();
    console.log(`Screenshot le raha hu: ${targetUrl}`);

    // Step 3: Nayi page pe open karke screenshot lo
    const instance = await getBrowser();
    screenshotPage = await instance.newPage();
    await screenshotPage.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await screenshotPage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));

    const screenshotDir = path.resolve(process.cwd(), "screenshots");
    fs.mkdirSync(screenshotDir, { recursive: true });

    const fileName = `shot-${Date.now()}.png`;
    const filePath = path.join(screenshotDir, fileName);
    await screenshotPage.screenshot({ path: filePath, fullPage: false });

    return `${searchResult}\n\n📸 Screenshot le liya pehle result ka!\nSaved: ${filePath}`;
  } catch (error) {
    throw new Error(`Arre bhai search+screenshot mein gadbad: ${error.message}`);
  } finally {
    if (screenshotPage) await screenshotPage.close().catch(() => {});
  }
}

// ─── OPEN URL ────────────────────────────────────────────────────────────────
async function openUrl(url) {
  try {
    const finalUrl = normalizeUrl(url);
    if (!finalUrl) throw new Error("URL dena padega bhai.");

    const page = await getPage();
    await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      const title = document.title || "Untitled Page";
      const paragraphs = Array.from(document.querySelectorAll("p, h1, h2, h3"))
        .map((el) => el.innerText?.trim())
        .filter(Boolean)
        .slice(0, 6);
      return { title, content: paragraphs.join(" ") };
    });

    const preview = data.content
      ? data.content.slice(0, 600)
      : "Page pe readable text kam mila bhai.";

    return `Page khul gaya bhai! ✅\nTitle: ${data.title}\nPreview: ${preview}`;
  } catch (error) {
    if (error.message.includes("detached") || error.message.includes("closed")) {
      activePage = null;
    }
    throw new Error(`Arre bhai URL open karne mein gadbad: ${error.message}`);
  }
}

// ─── SCREENSHOT ──────────────────────────────────────────────────────────────
async function takeScreenshot(url) {
  let page;
  try {
    const finalUrl = normalizeUrl(url);
    if (!finalUrl) throw new Error("Screenshot ke liye URL dena padega bhai.");

    const instance = await getBrowser();
    page = await instance.newPage(); // Screenshot ke liye nayi page

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.goto(finalUrl, { waitUntil: "networkidle2", timeout: 60000 });

    const screenshotDir = path.resolve(process.cwd(), "screenshots");
    fs.mkdirSync(screenshotDir, { recursive: true });

    const fileName = `shot-${Date.now()}.png`;
    const filePath = path.join(screenshotDir, fileName);
    await page.screenshot({ path: filePath, fullPage: true });

    return `Screenshot le liya bhai! ✅\nSaved: ${filePath}`;
  } catch (error) {
    throw new Error(`Arre bhai screenshot mein gadbad: ${error.message}`);
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

module.exports = { searchGoogle, searchAndScreenshot, openUrl, takeScreenshot };