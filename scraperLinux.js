const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// dir
if (typeof __dirname === 'undefined') {
    global.__dirname = path.resolve();
}

async function getProduct(ime, nacin) {
    console.log('Zaganjam brskalnik (headless)...');

    const possiblePaths = [
        '/snap/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
    ];

    let executablePath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log(`Najden brskalnik na: ${p}`);
            executablePath = p;
            break;
        }
    }

    if (!executablePath) {
        throw new Error('Ni mogoče najti nameščenega brskalnika. Namestite Chromium z: snap install chromium');
    }

    const browser = await puppeteer.launch({
        executablePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process']
    });

    const page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    const outputDir = path.join(__dirname, '/sites/public/data');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    let productCode = null;
    let productData = {};

    if (nacin === 'jager') {
        try {
            // 🔍 Jager
            console.log(`Iščem "${ime}" na TrgovineJager.com...`);
            await page.goto(`https://www.trgovinejager.com/iskalnik/?isci=${ime}`, { waitUntil: 'networkidle2' });

            try {
                await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
                await page.click('.bcms-cookies-btn--accept');
                await page.waitForTimeout(1000);
            } catch {
                console.log('Banner za piškotke ni bil prikazan.');
            }

            await page.waitForSelector('.item-box', { timeout: 10000 });
            const itemBox = await page.$('.item-box a');

            if (!itemBox) throw new Error('Ni bilo mogoče najti izdelka na Jager.');

            const productUrl = await page.evaluate(a => a.href, itemBox);
            console.log('✅ Najden izdelek:', productUrl);

            await page.goto(productUrl, { waitUntil: 'networkidle2' });
            await page.waitForSelector('.prod-number', { timeout: 10000 });

            productCode = (await page.$eval('.prod-number', el => el.textContent.trim())).replace(/\s+/g, '').trim().split(':')[1];
            const price = (await page.$eval('.price', el => el.textContent.trim())).replace(/\s+/g, '').replace(/[^\d,\.]/g, '');
            const imageSrc = await page.$eval('.slider-image img', img => img.src);
            const name = await page.$eval('.product-info__product-name', el => el.textContent.trim());

            productData = { name, price, imageSrc };
            console.log('✅ Podatki (Jager):', productData);

        } catch (error) {
            console.error('Napaka pri iskanju na TrgovineJager:', error);
        }

    } else if (nacin === 'veskajjes') {
        try {
            // 🔍 VesKajJes
            console.log(`Iščem "${ime}" na VesKajJes.si...`);
            await page.goto(`https://veskajjes.si/component/finder/search?q=${ime}`, { waitUntil: 'networkidle2' });

            try {
                await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
                await page.click('.bcms-cookies-btn--accept');
                await page.waitForTimeout(1000);
            } catch { }

            await page.waitForSelector('.arttitle', { timeout: 10000 });
            const name2 = (await page.$eval('.arttitle', el => el.textContent.trim())).replace(/\s+/g, '');
            const data = (await page.$eval('.vzstatus-table', el => el.textContent.trim())).replace(/\s+/g, '');

            productData.name2 = name2;
            productData.data = data;
            console.log('✅ Podatki (VesKajJes):', { name2, data });

        } catch (error) {
            console.error('Napaka pri iskanju na VesKajJes:', error);
        }

        try {
            const outputFileName = productCode || ime.replace(/\s+/g, '_');
            const outputPath = path.join(outputDir, `${outputFileName}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(productData, null, 2), 'utf8');
            console.log(`✅ Podatki shranjeni v: ${outputPath}`);
        } catch (err) {
            console.error('Napaka pri shranjevanju datoteke:', err);
        }

        await browser.close();
        return productCode || null;
    }
}

//getProductCode("mleko");

module.exports = { getProduct };
