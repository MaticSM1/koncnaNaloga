const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// Poskrbi za __dirname, če ne obstaja
if (typeof __dirname === 'undefined') {
    global.__dirname = path.resolve();
}

async function getProductCode(ime) {
    console.log('Zaganjam brskalnik (headless)...');

    // Možne poti do Chromium/Chrome
    const possiblePaths = [
        '/snap/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
    ];

    let executablePath = null;

    // Poiščimo delujočo pot
    for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
            console.log(`Najden brskalnik na: ${path}`);
            executablePath = path;
            break;
        }
    }

    if (!executablePath) {
        throw new Error('Ni mogoče najti nameščenega brskalnika. Namestite Chromium z: snap install chromium');
    }

    console.log(`Uporabljam brskalnik: ${executablePath}`);

    const browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-translate',
            '--disable-background-networking',
            '--disable-sync',
            '--metrics-recording-only',
            '--disable-default-browser-check',
            '--no-pings',
            '--single-process' // Pomembno za snap Chromium
        ]
    });

    const page = await browser.newPage();

    // User agent
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    try {
        console.log(`stran za "${ime}"...`);
        await page.goto(`https://www.trgovinejager.com/iskalnik/?isci=${ime}`, { waitUntil: 'networkidle2' });

        // Sprejmi piškotke, če so prikazani
        try {
            console.log('Ali so piskot?');
            await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
            console.log('sprejem piskotov...');
            await page.click('.bcms-cookies-btn--accept');
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log('Ni piskotov');
        }

        await page.waitForSelector('.item-box', { timeout: 10000 });

        console.log('povezava prvega izdelka...');
        const itemBox = await page.$('.item-box a');

        if (!itemBox) {
            console.log('Ni prvega izdelka');
            await browser.close();
            return null;
        }

        const productUrl = await page.evaluate(a => a.href, itemBox);
        console.log('✅:', productUrl);

        console.log(`izdelk: ${productUrl}`);
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

  
        console.log('šifra produkta...');
        await page.waitForSelector('.prod-number', { timeout: 10000 });

        const productCode = (await page.$eval('.prod-number', el => el.textContent.trim())).replace(/\s+/g, '').trim();
        let price = await page.$eval('.price', el => el.textContent.trim());
        price = price.replace(/\s+/g, '').replace(/\n/g, '').replace(/[^\d,\.]/g, '');

        const imageSrc = await page.$eval('.slider-image img', img => img.src);
        const name = await page.$eval('.product-info__product-name', el => el.textContent.trim());

        console.log('✅', productCode);

        await browser.close();

        // Shrani
        const outputDir = path.join(__dirname, '/sites/public/data');
        const outputPath = path.join(outputDir, `${productCode.split(":")[1]}.json`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify({ name, price, imageSrc }, null, 2), 'utf8');
        console.log(`✅ Podatki shranjeni v: ${outputPath}`);

        return productCode.split(":")[1];

    } catch (error) {
        console.error('Napaka pri getProductCode:', error);
        await browser.close();
        return null;
    }
}

//getProductCode("mleko");

module.exports = { getProductCode };