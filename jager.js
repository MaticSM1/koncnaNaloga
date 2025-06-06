const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

if (typeof __dirname === 'undefined') {
    global.__dirname = path.resolve();
}

async function getProductCode(ime) {
    console.log('Zaganjam brskalnik...');
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    console.log('Odpiram iskalno stran za "mleko"...');
    await page.goto(`https://www.trgovinejager.com/iskalnik/?isci=${ime}`, { waitUntil: 'networkidle2' });

    try {
        console.log('Preverjam, ali je prikazano obvestilo o piškotkih...');
        await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
        console.log('Klikam "Sprejmi vse"...');
        await page.click('.bcms-cookies-btn--accept');
        await page.waitForTimeout(1000); // počakaj sekundo
    } catch (e) {
        console.log('Banner za piškotke ni bil prikazan.');
    }

    console.log('Čakam na prikaz rezultatov...');
    await page.waitForSelector('.item-box', { timeout: 10000 });

    console.log('Pridobivam povezavo prvega izdelka...');
    const itemBox = await page.$('.item-box a');
    if (itemBox) console.log('Prvi izdelek najden, pridobivam URL...');
    console.log(itemBox);
    const productUrl = await page.evaluate(a => a.href, itemBox);
    console.log('✅ Povezava prvega izdelka:', productUrl);

    console.log(`Odpiram stran izdelka: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'networkidle2' });

    console.log('Čakam na prikaz šifre produkta...');
    await page.waitForSelector('.prod-number', { timeout: 10000 });

    let productCode = await page.$eval('.prod-number', el => el.textContent.trim());
    let price = await page.$eval('.price', el => el.textContent.trim());
    price = price.replace(/\s+/g, '').replace(/\n/g, '').replace(/[^\d,\.]/g, '');

    const imageSrc = await page.$eval('.slider-image img', img => img.src);
    console.log(imageSrc);

    const name = await page.$eval('.product-info__product-name', el => el.textContent.trim());
    console.log('✅ Šifra produkta:', productCode);
    productCode = productCode.replace(/\s+/g, '').trim();

    await browser.close();

    const outputDir = path.join(__dirname, '/sites/public/data');
    const outputPath = path.join(outputDir, `${productCode.split(":")[1]}.json`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify({ name, price,imageSrc   }, null, 2), 'utf8');
    console.log(`✅ Šifra produkta shranjena v ${outputPath}`);

    return productCode.split(":")[1];


}
getProductCode("mleko")
module.exports = { getProductCode };
