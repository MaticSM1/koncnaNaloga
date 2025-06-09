const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

if (typeof __dirname === 'undefined') {
    global.__dirname = path.resolve();
}

async function getProductCode(ime) {
    console.log('Zaganjam brskalnik (headless)...');
const browser = await puppeteer.launch({
    headless: false, // prikaz
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});


    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    console.log(`Odpiram iskalno stran za "${ime}"...`);
    await page.goto(`https://veskajjes.si/component/finder/search?q=${ime}`, { waitUntil: 'networkidle2' });

    try {
        console.log('Preverjam, ali je prikazano obvestilo o piškotkih...');
        await page.waitForSelector('.bcms-cookies-btn--accept', { timeout: 5000 });
        console.log('Klikam "Sprejmi vse"...');
        await page.click('.bcms-cookies-btn--accept');
        await page.waitForTimeout(1000);
    } catch (e) {
        console.log('Banner za piškotke ni bil prikazan.');
    }


    
    console.log('Čakam na prikaz šifre produkta...');
    await page.waitForSelector('.arttitle', { timeout: 10000 });

    const name2 = (await page.$eval('.arttitle', el => el.textContent.trim())).replace(/\s+/g, '').trim();
    const data = (await page.$eval('.vzstatus-table', el => el.textContent.trim())).replace(/\s+/g, '').trim();

    console.log('✅:', name2);
    console.log('✅:', data);

    await browser.close();

    const outputDir = path.join(__dirname, '/sites/public/data');
    const outputPath = path.join(outputDir, `${ime}.json`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let existingData = [];
    if (fs.existsSync(outputPath)) {
        try {
            existingData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
            if (!Array.isArray(existingData)) existingData = [existingData];
        } catch (e) {
            existingData = [];
        }
    }

    // nov
    const newEntry = { name2, data };
    const exists = existingData.some(
        item => item.name2 === newEntry.name2 && item.data === newEntry.data
    );
    if (!exists) {
        existingData.push(newEntry);
        fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2), 'utf8');
    }


    return true
}

 getProductCode("3831040002047");

module.exports = { getProductCode };
