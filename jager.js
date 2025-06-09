const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Poskrbi za __dirname, če ne obstaja
if (typeof __dirname === 'undefined') {
    global.__dirname = path.resolve();
}

async function getProductCode(ime) {
    console.log('Zaganjam brskalnik (headless)...');
    const browser = await puppeteer.launch({
        headless: 'new', // ali true za starejše različice
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // User agent
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    console.log(`Odpiram iskalno stran za "${ime}"...`);
    await page.goto(`https://www.trgovinejager.com/iskalnik/?isci=${ime}`, { waitUntil: 'networkidle2' });

    // Sprejmi piškotke, če so prikazani
    try {
        console.log('Preverjam, ali je prikazano obvestilo o piškotkih...');
        await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
        console.log('Klikam "Sprejmi vse"...');
        await page.click('.bcms-cookies-btn--accept');
        await page.waitForTimeout(1000);
    } catch (e) {
        console.log('Banner za piškotke ni bil prikazan.');
    }

    // Čakaj na rezultate
    console.log('Čakam na prikaz rezultatov...');
    await page.waitForSelector('.item-box', { timeout: 10000 });

    // Pridobi povezavo prvega izdelka
    console.log('Pridobivam povezavo prvega izdelka...');
    const itemBox = await page.$('.item-box a');

    if (!itemBox) {
        console.log('⚠️ Ni bilo mogoče najti prvega izdelka.');
        await browser.close();
        return null;
    }

    const productUrl = await page.evaluate(a => a.href, itemBox);
    console.log('✅ Povezava prvega izdelka:', productUrl);

    console.log(`stran izdelka: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'networkidle2' });

    // šifra produkta
    console.log('šifre produkta...');
    await page.waitForSelector('.prod-number', { timeout: 10000 });

    const productCode = (await page.$eval('.prod-number', el => el.textContent.trim())).replace(/\s+/g, '').trim();
    let price = await page.$eval('.price', el => el.textContent.trim());
    price = price.replace(/\s+/g, '').replace(/\n/g, '').replace(/[^\d,\.]/g, '');

    const imageSrc = await page.$eval('.slider-image img', img => img.src);
    const name = await page.$eval('.product-info__product-name', el => el.textContent.trim());

    console.log('✅:', productCode);

    await browser.close();

    // Shrani v datoteko
    const outputDir = path.join(__dirname, '/sites/public/data');
    const outputPath = path.join(outputDir, `${productCode.split(":")[1]}.json`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify({ name, price, imageSrc }, null, 2), 'utf8');
    console.log(`✅: ${outputPath}`);

    return productCode.split(":")[1];
}

getProductCode("mleko");

module.exports = { getProductCode };
