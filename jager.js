const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

if (typeof __dirname === 'undefined') {
    global.__dirname = path.resolve();
}

async function getProductCode(ime) {
    console.log('nov brskalnik...');
     const browser = await puppeteer.launch({
         headless: false, // prikaz
         args: ['--no-sandbox', '--disable-setuid-sandbox']
     });

    const page = await browser.newPage();

    // User agent
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    console.log(`stran za "${ime}"...`);
    await page.goto(`https://www.trgovinejager.com/iskalnik/?isci=${ime}`, { waitUntil: 'networkidle2' });

    try {
        console.log('Piskotki?');
        await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
        console.log('Sprejem piskotkov');
        await page.click('.bcms-cookies-btn--accept');
        await page.waitForTimeout(1000);
    } catch (e) {
        console.log('Piskotkov ni vec');
    }

    console.log('prikaz rezultatov...');
    await page.waitForSelector('.item-box', { timeout: 10000 });

    console.log('prvi izdelk...');
    const itemBox = await page.$('.item-box a');

    if (!itemBox) {
        console.log('Ni prvaga izdelka.');
        await browser.close();
        return null;
    }

    const productUrl = await page.evaluate(a => a.href, itemBox);
    console.log('✅:', productUrl);

    console.log(`stran izdelka: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'networkidle2' });

    console.log('šifre produkta...');
    await page.waitForSelector('.prod-number', { timeout: 10000 });

    const productCode = (await page.$eval('.prod-number', el => el.textContent.trim())).replace(/\s+/g, '').trim();
    let price = await page.$eval('.price', el => el.textContent.trim());
    price = price.replace(/\s+/g, '').replace(/\n/g, '').replace(/[^\d,\.]/g, '');

    const imageSrc = await page.$eval('.slider-image img', img => img.src);
    const name = await page.$eval('.product-info__product-name', el => el.textContent.trim());

    console.log('✅:', productCode);

    await browser.close();

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
