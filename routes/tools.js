const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

router.get('/run', (req, res) => {
    const process = exec('python3 orv/testServer.py');
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Transfer-Encoding': 'chunked' });
    process.stdout.on('data', data => res.write(data));
    process.stderr.on('data', data => res.write(`Napaka: ${data}`));
    process.on('close', code => res.end(`\nZaključen z kodo ${code}`));
});

router.get('/d', (req, res) => {
    const filePath = path.join(__dirname, '../files/app-debug.apk');
    if (fs.existsSync(filePath)) res.download(filePath, 'app-debug.apk');
    else res.status(404).send('Datoteka ne obstaja');
});

module.exports = router;
