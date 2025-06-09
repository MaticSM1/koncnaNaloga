const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

if (typeof __dirname === 'undefined') {
    global.__dirname = path.resolve();
}

async function getExecutablePath() {
    const possiblePaths = [
        '/snap/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('Ni mogoče najti nameščenega brskalnika. Namestite Chromium z: snap install chromium');
}

async function getProduct(ime, source = 'jager') {
    const executablePath = await getExecutablePath();
    console.log('Zaganjam brskalnik...');

    const browser = await puppeteer.launch({
        executablePath,
        headless: source === 'veskajjes' ? false : 'new',
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
            '--no-pings',
            '--single-process'
        ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    const outputDir = path.join(__dirname, '/sites/public/data');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    if (source === 'jager') {
        try {
            console.log(`Iščem "${ime}" na Trgovine Jager...`);
            await page.goto(`https://www.trgovinejager.com/iskalnik/?isci=${ime}`, { waitUntil: 'networkidle2' });

            try {
                await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
                await page.click('.bcms-cookies-btn--accept');
                await page.waitForTimeout(1000);
            } catch {}

            await page.waitForSelector('.item-box a', { timeout: 10000 });
            const productUrl = await page.$eval('.item-box a', a => a.href);
            console.log('✅ Najdena povezava:', productUrl);

            await page.goto(productUrl, { waitUntil: 'networkidle2' });
            await page.waitForSelector('.prod-number', { timeout: 10000 });

            const productCode = (await page.$eval('.prod-number', el => el.textContent.trim())).replace(/\s+/g, '');
            const price = (await page.$eval('.price', el => el.textContent.trim())).replace(/\s+/g, '').replace(/[^\d,\.]/g, '');
            const imageSrc = await page.$eval('.slider-image img', img => img.src);
            const name = await page.$eval('.product-info__product-name', el => el.textContent.trim());

            const cleanCode = productCode.split(":")[1] || productCode;
            const outputPath = path.join(outputDir, `${cleanCode}.json`);
            fs.writeFileSync(outputPath, JSON.stringify({ name, price, imageSrc }, null, 2), 'utf8');

            console.log(`✅ Podatki shranjeni v ${outputPath}`);
            await browser.close();
            return cleanCode;
        } catch (error) {
            console.error('Napaka (jager):', error);
            await browser.close();
            return null;
        }
    }

    // === vesKajJes.si ===
    if (source === 'veskajjes') {
        try {
            console.log(`Iščem "${ime}" na VesKajJes.si...`);
            await page.goto(`https://veskajjes.si/component/finder/search?q=${ime}`, { waitUntil: 'networkidle2' });

            try {
                await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
                await page.click('.bcms-cookies-btn--accept');
                await page.waitForTimeout(1000);
            } catch {}

            await page.waitForSelector('.arttitle', { timeout: 10000 });
            const name2 = (await page.$eval('.arttitle', el => el.textContent.trim())).replace(/\s+/g, '');
            const data = (await page.$eval('.vzstatus-table', el => el.textContent.trim())).replace(/\s+/g, '');

            const outputPath = path.join(outputDir, `${ime}.json`);

            let existingData = {};
            if (fs.existsSync(outputPath)) {
                try {
                    existingData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
                    if (typeof existingData !== 'object' || Array.isArray(existingData)) existingData = {};
                } catch {}
            }

            existingData.name2 = name2;
            existingData.data = data;
            fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2), 'utf8');

            console.log(`✅ Podatki shranjeni v ${outputPath}`);
            await browser.close();
            return true;
        } catch (error) {
            console.error('Napaka (veskajjes):', error);
            await browser.close();
            return null;
        }
    }

    await browser.close();
    return null;
}

// Primeri uporabe:
// getProductCode("mleko", "jager");
// getProductCode("3831040002047", "veskajjes");

module.exports = { getProduct };
