const express = require('express');
const aedes = require('aedes')({ decodePayload: false });
const net = require('net');
const session = require('express-session');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jager = require('./jagerLinux');
const fs = require('fs');
const path = require('path');
const { render } = require('ejs');
const { exec } = require('child_process');
const e = require('express');
require('dotenv').config();
const Product = require('./models/product.js');
const runningOnServer = process.env.RUNNING_ON_SERVER || false;
let avtentikacija = ""
let avtentikacijaDate = new Date();




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
global.client = client;

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("✅ MongoDB povezan");
    } catch (err) {
        console.error("❌ MongoDB napaka:", err);
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

//zacasno za razvoj 
app.use(`${proxy}/orvinput`, express.static(__dirname + '/orv/input'));
app.use(`${proxy}/orvinput2`, express.static(__dirname + '/orv/inputLogin'));


// Routes
app.get('/', (req, res) => {
    console.log(req.session.email);
    if (req.session.email) {
        if (req.session.login2f) {
            if (!req.session.login2fPotrditev) {
                if (avtentikacija == req.session.email && (new Date() - avtentikacijaDate) < 60000) {
                    req.session.login2fPotrditev = true;
                }
            }

            if (req.session.login2fPotrditev) {
                console.log('Prijavljen:', req.session.email);
                res.sendFile(__dirname + '/sites/portal.html');
            } else {
                console.log('Prijavljen:', req.session.email);
                res.sendFile(__dirname + '/sites/potrditev.html');

            }
        }
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
        const db = global.client.db('users');
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) return res.status(409).json({ message: 'Email že obstaja' });

        await db.collection('users').insertOne({ email, password, login2f: false, phoneId: "" });
        req.session.email = email;
        req.session.login2f = user.login2f;
        req.session.login2fPotrditev = false

        res.status(201).json({ message: 'Uporabnik uspešno registriran' });
    } catch (err) {
        console.error('Napaka pri registraciji:', err);
        res.status(500).json({ message: 'Napaka strežnika', error: err.message });
    }
});

app.post(`${proxy}/login`, async (req, res) => {
    const { email, password } = req.body;
    try {
        const db = global.client.db('users');
        const user = await db.collection('users').findOne({ email });
        if (user && user.password === password) {
            req.session.email = email;
            req.session.login2f = user.login2f;
        req.session.login2fPotrditev = false

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
        res.redirect('/');
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

app.listen(port, () => {
    console.log(`🌐 HTTP na portu ${port}`);
});

// ────────────────────────── MQTT ───────────────────────────────────────
const mqttPort = 1883;
const mqttServer = net.createServer(aedes.handle);
let clients = [];
let activeClients = [];
let steviloAktivnih1 = 0; // enostaven način
let steviloAktivnih2 = 0; // naš način


aedes.authorizeSubscribe = function (client, sub, callback) {
    if (sub.topic === 'imageRegister') {
        return callback(new Error('Nimate dovoljenja za branje te teme.'));
    } else {
        return callback(null, sub);
    }
};

mqttServer.listen(mqttPort, () => {
    console.log(`🚀 MQTT na portu ${mqttPort}`);
});

aedes.on('client', (client) => {
    console.log('📡 Nov:', client?.id);
    steviloAktivnih1++;
});

aedes.on('clientDisconnect', (client) => {
    console.log('📡 Dojava:', client?.id);
    steviloAktivnih1--;
    if (client && clients[client.id]) {
        delete clients[client.id];
    }
})




const orvInputDir = path.join(__dirname, 'orv/input');
let trenutnaRegistracija = {
    id: "",
    timestamp: Date.now(),
    slike: 0,
    status: ""
};

aedes.on('publish', (packet, client) => {



    if (!packet.topic || packet.topic.startsWith('$SYS')) return;

    console.log('📨 Objavljeno:', packet.topic);
    console.log('🧪 Buffer:', Buffer.isBuffer(packet.payload));
    console.log('🔢 Velikost:', packet.payload.length);

    const clientId = client ? client.id : 'neznano';
    console.log('👤 Objavil clientId:', clientId);
    if (clientId) activeClients[clientId] = new Date()
    steviloAktivnih2 = Object.keys(activeClients).length;

    const dataDir = path.join(__dirname, 'sites/public/data');

    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    if (packet.topic === 'images2') {
        fs.writeFile(path.join(dataDir, 'test2.jpg'), packet.payload, err => {
            if (err) console.error('❌ Napaka pri test2.jpg:', err);
            else console.log('✅ Slika uspešno shranjena kot test2.jpg');
        });
    }


    if (packet.topic === 'register') {
        const { username, password, UUID } = JSON.parse(packet.payload.toString());
        (async () => {
            try {
                const db = global.client.db('users');
                const existingUser = await db.collection('users').findOne({ email: username });
                if (existingUser) {
                    aedes.publish({
                        topic: username,
                        payload: Buffer.from('Email že obstaja'),
                        qos: 0,
                        retain: false
                    });
                } else {
                    await db.collection('users').insertOne({ email: username, password, login2f: false, phoneId: UUID });
                    clients[clientId] = username;
                    aedes.publish({
                        topic: username,
                        payload: Buffer.from('ok'),
                        qos: 0,
                        retain: false
                    });
                }
            } catch (err) {
                console.error('Napaka pri registraciji:', err);
                aedes.publish({
                    topic: username,
                    payload: Buffer.from('Napaka pri registraciji'),
                    qos: 0,
                    retain: false
                });
            }
        })();
    }

    if (packet.topic === 'login') {
        console.log('prijava:', packet.payload.toString());
        const { username, password, UUID } = JSON.parse(packet.payload.toString());
        (async () => {
            try {
                const db = global.client.db('users');
                const user = await db.collection('users').findOne({ email: username });
                if (user && user.password === password) {
                    if (UUID) {
                        await db.collection('users').updateOne(
                            { email: username },
                            { $set: { phoneId: UUID } }
                        );
                    }
                    clients[clientId] = username
                    aedes.publish({
                        topic: username,
                        payload: Buffer.from('ok'),
                        qos: 0,
                        retain: false
                    });
                } else {
                    aedes.publish({
                        topic: username,
                        payload: Buffer.from('Napačni podatki za prijavo'),
                        qos: 0,
                        retain: false
                    });
                }
            } catch (err) {
                console.error('Napaka pri prijavi:', err);
                aedes.publish({
                    topic: username,
                    payload: Buffer.from('Napaka pri prijavi'),
                    qos: 0,
                    retain: false
                });
            }
        })();
    }

    if (packet.topic === 'UUID') {
        console.log('UUID:', packet.payload.toString());
        let UUID = packet.payload.toString()
        console.log('UUID:', UUID);
        (async () => {
            try {
                const db = global.client.db('users');
                const user = await db.collection('users').findOne({ phoneId: UUID });
                if (user) {
                    clients[clientId] = user.email;
                    console.log('Najden uporabnik:', user.email);
                    aedes.publish({
                        topic: UUID.substring(0, 5),
                        payload: Buffer.from('ok'),
                        qos: 0,
                        retain: false
                    });
                } else {
                    aedes.publish({
                        topic: UUID.substring(0, 5),
                        payload: Buffer.from('UUID ne obstaja'),
                        qos: 0,
                        retain: false
                    });
                }
            } catch (err) {
                console.error('Napaka pri preverjanju UUID:', err);
                aedes.publish({
                    topic: UUID.substring(0, 5),
                    payload: Buffer.from('Napaka pri preverjanju UUID'),
                    qos: 0,
                    retain: false
                });
            }
        })();
    }

    if (packet.topic === 'imageRegister') {
        if (trenutnaRegistracija.id == "") {
            trenutnaRegistracija.id = clientId;
        }
        if (clientId == trenutnaRegistracija.id && trenutnaRegistracija.slike < 20) {
            trenutnaRegistracija.slike++;
            fs.writeFile(path.join(orvInputDir, `${trenutnaRegistracija.slike - 1}.jpg`), packet.payload, err => {
                if (err) console.error('Napaka pri shranjevanju slike', err);
            });
            console.log(`Slika ${trenutnaRegistracija.slike}  registracijo ${trenutnaRegistracija.id}`);
        } else {
            console.log('Zasedeno');
        }
    }

    if (packet.topic === 'imageLogin') {
        const inputLoginDir = path.join(__dirname, 'orv/inputLogin');
        if (!fs.existsSync(inputLoginDir)) fs.mkdirSync(inputLoginDir, { recursive: true });
        fs.writeFile(path.join(inputLoginDir, `test.jpg`), packet.payload, err => {
            if (err) console.error('Napaka slike za login', err);
            else console.log(`Slika za login shranjena`);

        });

        // linux prijava
        const pythonCmd = fs.existsSync('/usr/bin/python3') ? 'python3' : 'python';
        const scriptPath = path.join(__dirname, 'orv', 'testServer.py');
        const process = exec(`${pythonCmd} "${scriptPath}"`);

        process.stdout.on('data', (data) => {
            console.log(`Python stdout: ${data}`);
            if (data == "True\n") {
                // odgovor
                console.log(clients[clientId]);
                aedes.publish({
                    topic: clients[clientId],
                    payload: Buffer.from('ok'),
                    qos: 0,
                    retain: false
                });
                avtentikacija = clients[clientId];
                avtentikacijaDate = new Date();
            } else if (data == "False\n") {
                console.log('Napaka pri prijavi');
                aedes.publish({
                    topic: clients[clientId],
                    payload: Buffer.from('Napaka pri prijavi'),
                    qos: 0,
                    retain: false
                });
            }

        });

        process.stderr.on('data', (data) => {
            console.error(`Napaka: ${data}`);
        });

        process.on('close', (code) => {
            console.log(`Proces zaključen z izhodno kodo ${code}`);
        });

        process.on('error', (err) => {
            console.error(`Napaka pri zagonu skripte: ${err.message}`);
        });


    }


if (packet.topic === 'QR') {
  try {
    const { qrcode, latitude, longitude } = JSON.parse(packet.payload.toString());

    const newProduct = new Product({
      qrcode,
      latitude,
      longitude,
    });

    newProduct.save()
      .then(() => console.log('Product saved:', newProduct))
      .catch(err => console.error('Error saving product:', err));
  } catch (err) {
    console.error('Failed to parse packet payload:', err);
  }
}
});
