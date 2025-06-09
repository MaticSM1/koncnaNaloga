const express = require('express');
const aedes = require('aedes')({ decodePayload: false });
const net = require('net');
const session = require('express-session');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jager = require('./jagerLinux');
const jagerWin = require('./jager');

const scraper = require('./scraperLinux');
const fs = require('fs');
const path = require('path');
const { render } = require('ejs');
const { exec } = require('child_process');
const e = require('express');
require('dotenv').config();
const Product = require('./models/product.js');
const User = require('./models/user.js');
const bcrypt = require('bcrypt');


const runningOnServer = (process.env.SERVER == "TRUE");
console.log('Running on server:', runningOnServer);
let avtentikacija = ""
let avtentikacijaDate = new Date();



const app = express();
const port = 3000;
let proxy = process.env.PROXY || "/wisfi";
if (proxy == "ne") poxy = "";

// MongoDB povezava
const uri = process.env.MONGO_URI || "VNESI URI MONGODB!!!";
let client;
try {
    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
} catch (err) {
    console.error("Napaka pri podatkovni bazi:", err);
}
global.client = client;

const mongoose = require('mongoose');
const user = require('./models/user.js');

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("✅ MongoDB native client povezan");

        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Mongoose povezan");
    } catch (err) {
        console.error("❌ Napaka pri povezovanju:", err);
    }
}
run().catch(console.dir);

// Middleware
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET ||"Ni nastavljen",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(`${proxy}/public`, express.static(__dirname + '/sites/public'));
app.set('view engine', 'ejs');

//zacasno za razvoj 
app.use(`${proxy}/orvinput`, express.static(__dirname + '/orv/input'));
app.use(`${proxy}/orvinput2`, express.static(__dirname + '/orv/inputLogin'));


// Routes
app.get('/', async (req, res) => {
    console.log(req.session.email);
    if (req.session.email) {
        if (req.session.login2f) {
            if (!req.session.login2fPotrditev) {
                if (avtentikacija == req.session.email && (new Date() - avtentikacijaDate) < 60000) {
                    req.session.login2fPotrditev = true;
                }
            }

            if (req.session.login2fPotrditev) {
                console.log('Prijavljen1:', req.session.email);
                try {
                    const products = await Product.find().sort({ _id: -1 }).limit(3);
                    res.render('portal', { products });
                } catch (err) {
                    res.render('portal', {});
                }
            } else {
                console.log('Prijavljen2:', req.session.email);
                res.sendFile(__dirname + '/sites/potrditev.html');
            }
        } else {
            try {
                const products = await Product.find().sort({ _id: -1 }).limit(3);
                res.render('portal', { products });
            } catch (err) {
                res.render('portal', {});
            }
        }
    } else {
        console.log('Neprijavljen obiskovalec');
        res.render('main');

    }
});

app.get(`${proxy}/ping`, (req, res) => {
    console.log('Ping');
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

        const hashedPassword = await bcrypt.hash(password, 10); // 10 je "salt rounds"

        const newUser = new User({
            username,
            password: hashedPassword,
            login2f: false,
            phoneId: ''
        });

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

        if (!user) {
            return res.status(401).json({ message: 'Napačni podatki za prijavo' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Napačni podatki za prijavo' });
        }

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
        try {
            let result
            if (runningOnServer) result = await jager.getProductCode(name);
            else result = await jagerWin.getProductCode(name);
            res.json({ result });
        } catch (err) {
            console.error('Napaka pri getProductCode:', err);
            res.status(500).json({ message: 'Napaka pri iskanju kode izdelka', error: err.message });
        }
    } catch (err) {
        res.status(500).json({ message: 'Napaka pri obdelavi', error: err.message });
    }
});

app.get(`${proxy}/izdelek`, async (req, res) => {
    const { id } = req.query;

    try {
        const dataPath = path.join(__dirname, 'sites/public/data', `${id}.json`);
        if (!fs.existsSync(dataPath)) {
            // await jager.getProductCode(id);
            await scraper.getProduct(id, "veskajjes");
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            res.render('izdelek', { data });
            await scraper.getProduct(id, "jager");
            return
            // res.render('nalaganjeIzdelka');

        }
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        res.render('izdelek', { data });
    } catch (err) {
        console.log('Napaka pri branju izdelka:', err);
        res.status(500).send('Napaka strežnika');
    }

});

app.get(`${proxy}/history`, async (req, res) => {
    const { id } = req.query;

    try {
        const user = await User.findOne({ username: id }).populate('products');
        if (!user) {
            return res.status(404).send('User not found');
        }
        const productNames = user.products
        console.log(productNames);
        res.render('zgodovina', { productNames });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});



app.get(`${proxy}/zemljevid`, async (req, res) => {
    const user2 = req.session.email

    if (!user2) {
        res.redirect(`${proxy}/`);
    }

    try {
        console.log('Zemljevid uporabnika:', user2);
        const user = await User.findOne({ username: user2 }).populate('products');
        if (!user) {
            return res.status(404).send('User not found');
        }
        const productNames = user.products;
        console.log(productNames);
        res.render('zemljevid', { productNames });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
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

    process.stdout.on('data', (data) => {
        res.write(data);
        process.stdout.pipe(process.stdout);
    });

    process.stderr.on('data', (data) => {
        res.write(`Napaka: ${data}`);
        process.stderr.pipe(process.stderr);
    });

    process.on('close', (code) => {
        res.write(`\nProces zaključen z izhodno kodo ${code}`);
        res.end();
    });

    process.on('error', (err) => {
        res.write(`Napaka pri zagonu skripte: ${err.message}`);
        res.end();
    });
});


app.get(`${proxy}/run2`, (req, res) => {
    const pythonCmd = fs.existsSync('/usr/bin/python3') ? 'python3' : 'python';
    const scriptPath = path.join(__dirname, 'orv', 'testServer.py');
    const process = exec(`${pythonCmd} "${scriptPath}"`);

    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
    });

    process.stdout.on('data', (data) => {
        res.write(data);
    });

    process.stderr.on('data', (data) => {
        res.write(`Napaka: ${data}`);
    });

    process.on('close', (code) => {
        res.write(`\nProces zaključen z izhodno kodo ${code}`);
        res.end();
    });

    process.on('error', (err) => {
        res.write(`Napaka pri zagonu skripte: ${err.message}`);
        res.end();
    });
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
    if (req.session.email) {
        console.log('Prijavljen:', req.session.email);
        res.render('nastavitve', {}, (err, html) => {
            if (err) {
                console.error('Napka nastavitve:', err);
                return res.status(500).send('Napaka pri nalaganju strani');
            }
            res.send(html);
        });
    } else {
        console.log('Neprijavljen obiskovalec');
        res.redirect(`/${proxy}/`);
    }
});
app.post(`${proxy}/nastavi2f`, async (req, res) => {
    if (!req.session.email) {
        return res.status(401).json({ message: 'Niste prijavljeni' });
    }
    try {
        const db = global.client.db('users');
        const user = await db.collection('users').findOne({ email: req.session.email });
        if (!user || !user.phoneId) {
            return res.status(400).json({ message: 'Za vklop 2FA morate najprej registrirati UUID (telefon).' });
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
    if (!req.session.email) {
        return res.status(401).json({ message: 'Niste prijavljeni' });
    }
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


app.listen(port, () => {
    console.log(`🌐 HTTP na portu ${port}`);
});

// ────────────────────────── MQTT ───────────────────────────────────────
let mqtt = require('./mqtt.js');