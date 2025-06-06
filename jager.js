const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 🔧 Ročno nastavljena pot do sistemskega Chromiuma (ne Snap!)
const CHROME_PATH = '/usr/bin/chromium-browser';

async function getProductCode(ime) {
  console.log('🔍 Začenjam iskanje izdelka:', ime);

  // ✅ Preveri, ali Chromium obstaja
  if (!fs.existsSync(CHROME_PATH)) {
    console.error(`❌ Chromium ni najden na poti: ${CHROME_PATH}`);
    return null;
  }

  let browser;
  try {
    console.log('🚀 Zaganjam brskalnik (headless)...');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    await page.goto(`https://www.trgovinejager.com/iskalnik/?isci=${ime}`, {
      waitUntil: 'networkidle2',
    });

    // Sprejmi piškotke, če obstajajo
    try {
      await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
      await page.click('.bcms-cookies-btn--accept');
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('ℹ️ Piškotni banner ni bil prikazan.');
    }

    // Čakaj na rezultate
    await page.waitForSelector('.item-box', { timeout: 10000 });
    const itemBox = await page.$('.item-box a');

    if (!itemBox) {
      console.log('❌ Ni bilo mogoče najti izdelka.');
      return null;
    }

    const productUrl = await page.evaluate(a => a.href, itemBox);
    console.log('✅ Povezava do izdelka:', productUrl);

    await page.goto(productUrl, { waitUntil: 'networkidle2' });

    await page.waitForSelector('.prod-number', { timeout: 10000 });

    let productCode = await page.$eval('.prod-number', el => el.textContent.trim());
    let price = await page.$eval('.price', el => el.textContent.trim());
    const imageSrc = await page.$eval('.slider-image img', img => img.src);
    const name = await page.$eval('.product-info__product-name', el => el.textContent.trim());

    // Očisti podatke
    productCode = productCode.replace(/\s+/g, '').trim();
    price = price.replace(/\s+/g, '').replace(/\n/g, '').replace(/[^\d,\.]/g, '');

    // 🔧 Shrani podatke v lokalno datoteko
    const outputDir = path.join(__dirname, '/sites/public/data');
    const productId = productCode.split(':')[1];
    const outputPath = path.join(outputDir, `${productId}.json`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      outputPath,
      JSON.stringify({ name, price, imageSrc }, null, 2),
      'utf8'
    );

    console.log(`✅ Podatki shranjeni: ${outputPath}`);
    return productId;

  } catch (err) {
    console.error('❌ Napaka pri getProductCode:', err.message || err);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// ❗Za lokalni test odkomentiraj spodnjo vrstico:
// getProductCode('mleko');

module.exports = { getProductCode };
