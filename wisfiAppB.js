require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const jager = require('./jagerLinux');
const scraper = require('./scraperLinux');
const Product = require('./models/product.js');
const User = require('./models/user.js');

// ───── EXPRESS APP INICIACIJA ─────
const app = express();
const port = process.env.PORT || 3000;
const proxy = process.env.PROXY || "";
const mongoUri = process.env.MONGO_URI;



// ───── MONGO KONFIGURACIJA ─────
const client = new MongoClient(mongoUri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
});
global.client = client;

// ───── EXPRESS MIDDLEWARE ─────
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.set('view engine', 'ejs');
app.use(`${proxy}/public`, express.static(path.join(__dirname, 'sites/public')));
app.use(`${proxy}/orvinput`, express.static(path.join(__dirname, 'orv/input')));
app.use(`${proxy}/orvinput2`, express.static(path.join(__dirname, 'orv/inputLogin')));

// ───── HTTP ROUTES ─────
app.get('/', async (req, res) => {
    if (req.session.email) {
        if (req.session.login2f && !req.session.login2fPotrditev) {
            if (mqtt.mqtt.avtentikacija === req.session.email && (new Date() - mqtt.mqtt.avtentikacijaDate) < 60000) {
                req.session.login2fPotrditev = true;
            }
        }

        if (!req.session.login2f || req.session.login2fPotrditev) {
            try {
                const products = await Product.find().sort({ _id: -1 }).limit(3);
                return res.render('portal', { products });
            } catch {
                return res.render('portal', {});
            }
        } else {
            return res.sendFile(path.join(__dirname, 'sites/potrditev.html'));
        }
    } else {
        res.render('main');
    }
});

app.get(`${proxy}/ping`, (req, res) => {
    res.send('Pong!');
});

app.get(`${proxy}/logout`, (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Napaka pri odjavi');
        res.redirect('/');
    });
});

app.post(`${proxy}/register`, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ message: 'Uporabniško ime in geslo sta obvezna' });

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser)
            return res.status(409).json({ message: 'Uporabniško ime že obstaja' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, login2f: false, phoneId: '' });
        await newUser.save();

        req.session.email = username;
        req.session.login2f = newUser.login2f;
        req.session.login2fPotrditev = false;

        res.status(201).json({ message: 'Uporabnik uspešno registriran' });
    } catch (err) {
        console.error('Napaka pri registraciji:', err);
        res.status(500).json({ message: 'Napaka strežnika', error: err.message });
    }
});

app.post(`${proxy}/login`, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ message: 'Uporabniško ime in geslo sta obvezna' });

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ message: 'Napačni podatki za prijavo' });

        const isCorrect = await bcrypt.compare(password, user.password);
        if (!isCorrect) return res.status(401).json({ message: 'Napačni podatki za prijavo' });

        req.session.email = username;
        req.session.login2f = user.login2f;
        req.session.login2fPotrditev = false;

        res.status(200).json({ message: 'Prijava uspešna' });
    } catch (err) {
        console.error('Napaka pri prijavi:', err);
        res.status(500).json({ message: 'Napaka strežnika', error: err.message });
    }
});

app.get(`${proxy}/getItems`, async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: 'Manjka parameter name' });

    try {
        const result = await jager.getProductCode(name);
        res.json({ result });
    } catch (err) {
        console.error('Napaka pri getProductCode:', err);
        res.status(500).json({ message: 'Napaka pri iskanju kode izdelka', error: err.message });
    }
});

app.get(`${proxy}/izdelek`, async (req, res) => {
    const { id } = req.query;
    const dataPath = path.join(__dirname, 'sites/public/data', `${id}.json`);

    try {
        if (!fs.existsSync(dataPath)) {
            await scraper.getProduct(id, "veskajjes");
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            res.render('izdelek', { data });
            await scraper.getProduct(id, "jager");
            return;
        }
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        res.render('izdelek', { data });
    } catch (err) {
        console.error('Napaka pri branju izdelka:', err);
        res.status(500).send('Napaka strežnika');
    }
});

app.get(`${proxy}/history`, async (req, res) => {
    const { id } = req.query;

    try {
        const user = await User.findOne({ username: id }).populate('products');
        if (!user) return res.status(404).send('User not found');
        res.render('zgodovina', { productNames: user.products });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get(`${proxy}/zemljevid`, (req, res) => {
    res.render('zemljevid');
});

app.get(`/wisfi`, (req, res) => {
    res.redirect('/');
});

app.get(`${proxy}/run`, (req, res) => {
    const process = exec('python3 orv/testServer.py');
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
    });
    process.stdout.on('data', data => res.write(data));
    process.stderr.on('data', data => res.write(`Napaka: ${data}`));
    process.on('close', code => res.end(`\nProces zaključen z izhodno kodo ${code}`));
    process.on('error', err => res.end(`Napaka pri zagonu skripte: ${err.message}`));
});

app.get(`${proxy}/run2`, (req, res) => {
    const pythonCmd = fs.existsSync('/usr/bin/python3') ? 'python3' : 'python';
    const scriptPath = path.join(__dirname, 'orv', 'testServer.py');
    const process = exec(`${pythonCmd} "${scriptPath}"`);
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
    });
    process.stdout.on('data', data => res.write(data));
    process.stderr.on('data', data => res.write(`Napaka: ${data}`));
    process.on('close', code => res.end(`\nProces zaključen z izhodno kodo ${code}`));
    process.on('error', err => res.end(`Napaka pri zagonu skripte: ${err.message}`));
});

app.get(`${proxy}/d`, (req, res) => {
    const filePath = path.join(__dirname, 'files', 'app-debug.apk');
    if (fs.existsSync(filePath)) {
        res.download(filePath, 'app-debug.apk');
    } else {
        res.status(404).send('Datoteka ne obstaja');
    }
});

app.get(`${proxy}/nastavitve`, (req, res) => {
    if (!req.session.email) return res.redirect('/');
    res.render('nastavitve', {}, (err, html) => {
        if (err) return res.status(500).send('Napaka pri nalaganju strani');
        res.send(html);
    });
});

app.post(`${proxy}/nastavi2f`, async (req, res) => {
    if (!req.session.email) return res.status(401).json({ message: 'Niste prijavljeni' });

    try {
        const db = global.client.db('users');
        const user = await db.collection('users').findOne({ email: req.session.email });
        if (!user || !user.phoneId) {
            return res.status(400).json({ message: 'Najprej registrirajte UUID (telefon).' });
        }
        await db.collection('users').updateOne(
            { email: req.session.email },
            { $set: { login2f: true } }
        );
        req.session.login2f = true;
        res.json({ message: 'ok' });
    } catch (err) {
        console.error('Napaka pri vklopu 2FA:', err);
        res.status(500).json({ message: 'Napaka strežnika', error: err.message });
    }
});

app.post(`${proxy}/izklopi2f`, async (req, res) => {
    if (!req.session.email) return res.status(401).json({ message: 'Niste prijavljeni' });

    try {
        const db = global.client.db('users');
        await db.collection('users').updateOne(
            { email: req.session.email },
            { $set: { login2f: false } }
        );
        req.session.login2f = false;
        res.json({ message: 'ok' });
    } catch (err) {
        console.error('Napaka pri izklopu 2FA:', err);
        res.status(500).json({ message: 'Napaka strežnika', error: err.message });
    }
});

app.get(`${proxy}/seznam`, (req, res) => {
    res.render('seznam');
});

// ───── Vključi MQTT strežnik ─────
let mqtt =  require('./mqtt.js');

// ───── Zaženi HTTP server ─────
async function start() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("✅ MongoDB native client povezan");

        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ Mongoose povezan");

        app.listen(port, () => {
            console.log(`🌐 HTTP strežnik posluša na portu ${port}`);
        });
    } catch (err) {
        console.error('❌ Napaka pri zagonu strežnika:', err);
        process.exit(1);
    }
}

start();
