// mqttServer.js
const aedes = require('aedes')({ decodePayload: false });
const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Product = require('../models/product');
const User = require('../models/user');

const mqttPort = 1883;
let clients = [];
let activeClients = [];
let trenutnaRegistracija = { id: "", timestamp: Date.now(), slike: 0, status: "" };
let avtentikacija = "";
let avtentikacijaDate = new Date();

const mqttServer = net.createServer(aedes.handle);

aedes.authorizeSubscribe = (client, sub, callback) => {
    if (sub.topic === 'imageRegister') {
        return callback(new Error('Nimate dovoljenja za branje te teme.'));
    } else {
        return callback(null, sub);
    }
};

mqttServer.listen(mqttPort, () => {
    console.log(`🚀 MQTT na portu ${mqttPort}`);
});

aedes.on('client', client => {
    console.log('📡 Nov:', client?.id);
    activeClients[client?.id] = new Date();
});

aedes.on('clientDisconnect', client => {
    console.log('📡 Dojava:', client?.id);
    if (client && clients[client.id]) delete clients[client.id];
    if (client && activeClients[client.id]) delete activeClients[client.id];
});

aedes.on('publish', (packet, client) => {
    if (!packet.topic || packet.topic.startsWith('$SYS')) return;

    const clientId = client ? client.id : 'neznano';
    const dataDir = path.join(__dirname, '../sites/public/data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    switch (packet.topic) {
        case 'images2':
            fs.writeFile(path.join(dataDir, 'test2.jpg'), packet.payload, err => {
                if (err) console.error('❌ Napaka pri test2.jpg:', err);
            });
            break;

        case 'register':
            handleRegister(packet, clientId);
            break;

        case 'login':
            handleLogin(packet, clientId);
            break;

        case 'UUID':
            handleUUID(packet, clientId);
            break;

        case 'imageRegister':
            handleImageRegister(packet, clientId);
            break;

        case 'imageLogin':
            handleImageLogin(packet, clientId);
            break;

        case 'QR':
            handleQR(packet, clientId);
            break;
    }
});

// --------------- Handlers ---------------
async function handleRegister(packet, clientId) {
    const { username, password, UUID } = JSON.parse(packet.payload.toString());
    try {
        const db = global.client.db('users');
        const existingUser = await db.collection('users').findOne({ email: username });
        if (existingUser) {
            return aedes.publish({ topic: username, payload: Buffer.from('Email že obstaja') });
        }

        await db.collection('users').insertOne({ email: username, password, login2f: false, phoneId: UUID });
        clients[clientId] = username;
        aedes.publish({ topic: username, payload: Buffer.from('ok') });

    } catch (err) {
        console.error('Napaka pri registraciji:', err);
        aedes.publish({ topic: username, payload: Buffer.from('Napaka pri registraciji') });
    }
}

async function handleLogin(packet, clientId) {
    const { username, password, UUID } = JSON.parse(packet.payload.toString());
    try {
        const db = global.client.db('users');
        const user = await db.collection('users').findOne({ email: username });
        if (user && user.password === password) {
            if (UUID) {
                await db.collection('users').updateOne({ email: username }, { $set: { phoneId: UUID } });
            }
            clients[clientId] = username;
            aedes.publish({ topic: username, payload: Buffer.from('ok') });
        } else {
            aedes.publish({ topic: username, payload: Buffer.from('Napačni podatki za prijavo') });
        }
    } catch (err) {
        console.error('Napaka pri prijavi:', err);
        aedes.publish({ topic: username, payload: Buffer.from('Napaka pri prijavi') });
    }
}

async function handleUUID(packet, clientId) {
    const UUID = packet.payload.toString();
    try {
        const db = global.client.db('users');
        const user = await db.collection('users').findOne({ phoneId: UUID });
        if (user) {
            clients[clientId] = user.email;
            aedes.publish({ topic: UUID.substring(0, 5), payload: Buffer.from('ok') });
        } else {
            aedes.publish({ topic: UUID.substring(0, 5), payload: Buffer.from('UUID ne obstaja') });
        }
    } catch (err) {
        console.error('Napaka pri preverjanju UUID:', err);
        aedes.publish({ topic: UUID.substring(0, 5), payload: Buffer.from('Napaka pri preverjanju UUID') });
    }
}

function handleImageRegister(packet, clientId) {
    const inputDir = path.join(__dirname, '../orv/input');
    if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });

    if (trenutnaRegistracija.id == "") {
        trenutnaRegistracija.id = clientId;
    }

    if (clientId === trenutnaRegistracija.id && trenutnaRegistracija.slike < 20) {
        const imageIndex = trenutnaRegistracija.slike++;
        fs.writeFile(path.join(inputDir, `${imageIndex}.jpg`), packet.payload, err => {
            if (err) console.error('Napaka pri shranjevanju slike', err);
        });
    } else {
        console.log('Zasedeno');
    }
}

function handleImageLogin(packet, clientId) {
    const inputLoginDir = path.join(__dirname, '../orv/inputLogin');
    if (!fs.existsSync(inputLoginDir)) fs.mkdirSync(inputLoginDir, { recursive: true });

    const imagePath = path.join(inputLoginDir, `test.jpg`);
    fs.writeFileSync(imagePath, packet.payload);

    const scriptPath = path.join(__dirname, '../orv', 'testServer.py');
    const pythonCmd = fs.existsSync('../usr/bin/python3') ? 'python3' : 'python';
    const process = exec(`${pythonCmd} "${scriptPath}"`);

    process.stdout.on('data', (data) => {
        if (data.trim() === "True") {
            aedes.publish({ topic: clients[clientId], payload: Buffer.from('ok') });
            avtentikacija = clients[clientId];
            avtentikacijaDate = new Date();
        } else if (data.trim() === "False") {
            aedes.publish({ topic: clients[clientId], payload: Buffer.from('Napaka pri prijavi') });
        }
    });

    process.stderr.on('data', (data) => {
        console.error(`Napaka: ${data}`);
    });
}

function handleQR(packet, clientId) {
    try {
        const { qr, lat, lon, light } = JSON.parse(packet.payload.toString());
        const newProduct = new Product({ qrcode: qr, latitude: lat, longitude: lon, light: light });
        const username = clients[clientId];

        newProduct.save()
            .then(product => User.findOneAndUpdate(
                { username },
                { $push: { products: product._id } },
                { new: true }
            ))
            .then(user => {
                if (user) console.log(`Dodan produkt k uporabniku: ${user.username}`);
            })
            .catch(err => console.error('Napaka pri shranjevanju QR:', err));
    } catch (err) {
        console.error('Napaka pri obdelavi QR:', err);
    }
}

module.exports = {
    mqttServer,
    clients,
    activeClients,
    avtentikacija,
    avtentikacijaDate
};
