const express = require('express');
const aedes = require('aedes')({ decodePayload: false });
const net = require('net');
const session = require('express-session');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jager = require('./jagerLinux');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const runningOnServer = process.env.RUNNING_ON_SERVER || false;


const app = express();
const port = 3000;
let proxy = process.env.PROXY || "";

// MongoDB povezava
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("✅ MongoDB connected!");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
    }
}
run().catch(console.dir);

// Middleware
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(`${proxy}/public`, express.static(__dirname + '/sites/public'));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    if (req.session?.email) {
        console.log('Prijavljen:', req.session.email);
        res.sendFile(__dirname + '/sites/portal.html');
    } else {
        console.log('Neprijavljen obiskovalec');
        res.sendFile(__dirname + '/sites/main.html');
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
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email in geslo sta obvezna' });

    try {
        const db = client.db('users');
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) return res.status(409).json({ message: 'Email že obstaja' });

        await db.collection('users').insertOne({ email, password });
        req.session.email = email;
        res.status(201).json({ message: 'Uporabnik uspešno registriran' });
    } catch (err) {
        console.error('Napaka pri registraciji:', err);
        res.status(500).json({ message: 'Napaka strežnika', error: err.message });
    }
});

app.post(`${proxy}/login`, async (req, res) => {
    const { email, password } = req.body;
    try {
        const db = client.db('users');
        const user = await db.collection('users').findOne({ email });
        if (user && user.password === password) {
            req.session.email = email;
            res.status(200).json({ message: 'Prijava uspešna' });
        } else {
            res.status(401).json({ message: 'Napačni podatki za prijavo' });
        }
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
            const result = await jager.getProductCode(name);
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
            await jager.getProductCode(id);
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            return res.render('izdelek', { data });
            // res.render('nalaganjeIzdelka');

        }
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        res.render('izdelek', { data });
    } catch (err) {
        console.log('Napaka pri branju izdelka:', err);
        res.status(500).send('Napaka strežnika');
    }

});

app.listen(port, () => {
    console.log(`🌐 HTTP strežnik na http://localhost:${port}`);
});

// ────────────────────────── MQTT ───────────────────────────────────────
const mqttPort = 1883;
const mqttServer = net.createServer(aedes.handle);
let clients = [];


aedes.authorizeSubscribe = function (client, sub, callback) {
    if (sub.topic === 'imageRegister') {
        return callback(new Error('Nimate dovoljenja za branje (subscribe) tem.'));
    } else {
        return callback(null, sub);
    }

};

mqttServer.listen(mqttPort, () => {
    console.log(`🚀 MQTT strežnik (aedes) pripravljen na portu ${mqttPort}`);
});

aedes.on('client', (client) => {
    console.log('📡 Odjemalec povezan:', client?.id || 'neznano');
});


const orvInputDir = path.join(__dirname, 'sites/public/data');
let trenutnaRegistracija = {
    id: "",
    timestamp: Date.now(),
    slike: 0,
    status: ""
}

aedes.on('publish', (packet, client) => {

    if (!packet.topic || packet.topic.startsWith('$SYS')) return;

    console.log('📨 Objavljeno:', packet.topic);
    console.log('🧪 Buffer:', Buffer.isBuffer(packet.payload));
    console.log('🔢 Velikost:', packet.payload.length);

    const clientId = client ? client.id : 'neznano';
    console.log('👤 Objavil clientId:', clientId);

    const dataDir = path.join(__dirname, 'sites/public/data');

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    if (packet.topic === 'images2') {
        fs.writeFile(path.join(dataDir, 'test2.jpg'), packet.payload, err => {
            if (err) console.error('❌ Napaka pri test2.jpg:', err);
            else console.log('✅ Slika uspešno shranjena kot test2.jpg');
        });
    }

    if (packet.topic === 'login') {
        console.log('prijava:', packet.payload.toString());
        const { username, password } = JSON.parse(packet.payload.toString());
        console.log(username, password);
        clients[clientId] = username
        aedes.publish({
            topic: username,
            payload: Buffer.from('ok'),
            qos: 0,
            retain: false
        });

    }

    if (packet.topic === 'imageRegister') {

        if (trenutnaRegistracija.id == "") {
            trenutnaRegistracija.id = clientId;
        }

        if (clientId == trenutnaRegistracija.id && trenutnaRegistracija.slike < 20) {
            fs.writeFile(path.join(orvInputDir, `${trenutnaRegistracija.slike}.jpg`), packet.payload, err => {
                if (err) console.error('Napaka pri shranjevanju slike', err);
                trenutnaRegistracija.slike++;
            });
        } else {
            console.log('Zasedeno');
        }

    }
});
