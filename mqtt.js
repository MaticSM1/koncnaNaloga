// mqtt2-client.js
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const bcrypt = require('bcrypt');
const Product = require('./models/product.js');
const User = require('./models/user.js');

let clients = [];
let activeClients = [];
let trenutnaRegistracija = { id: "", timestamp: Date.now(), slike: 0, status: "" };
let avtentikacija = "";
let avtentikacijaDate = new Date();

let ws;
try {
    ws = require("./ws.js")
    ws.createWebSocketServer(8077);
} catch (e) {
    console.error("Napaka ws.js:", e);
}

const orvInputDir = path.join(__dirname, 'orv/input');
const inputLoginDir = path.join(__dirname, 'orv/inputLogin');
if (!fs.existsSync(orvInputDir)) fs.mkdirSync(orvInputDir, { recursive: true });
if (!fs.existsSync(inputLoginDir)) fs.mkdirSync(inputLoginDir, { recursive: true });

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('🚀 Povezan na Mosquitto');
    client.subscribe(['register', 'login', 'UUID', 'imageRegister', 'imageLogin', 'QR', 'images2'], (err) => {
        if (err) console.error('Napaka pri subscribe:', err);
        else console.log('✅ Subscribe uspešen');
    });
});

client.on('message', async (topic, message) => {
    const clientId = 'mqtt-client'; // po potrebi prilagodi
    const dataDir = path.join(__dirname, 'sites/public/data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    try {
        switch (topic) {
            case 'images2':
                fs.writeFile(path.join(dataDir, 'test2.jpg'), message, err => {
                    if (err) console.error('❌ Napaka pri test2.jpg:', err);
                    else console.log('✅ Slika uspešno shranjena kot test2.jpg');
                });
                break;

            case 'register': {
                const { username, password, UUID } = JSON.parse(message.toString());
                const existingUser = await User.findOne({ email: username });
                if (existingUser) {
                    client.publish(username, 'Email že obstaja');
                } else {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    const newUser = new User({ username, password: hashedPassword, login2f: false, phoneId: UUID });
                    await newUser.save();
                    clients[clientId] = username;
                    client.publish(username, 'ok');
                }
                break;
            }

            case 'login': {
                const { username, password, UUID } = JSON.parse(message.toString());
                const user = await User.findOne({ email: username });
                if (user && user.password === password) {
                    if (UUID) await User.updateOne({ username }, { $set: { phoneId: UUID } });
                    clients[clientId] = username;
                    client.publish(username, 'ok');
                } else {
                    client.publish(username, 'Napačni podatki za prijavo');
                }
                break;
            }

            case 'UUID': {
                const UUID = message.toString();
                const user = await User.findOne({ phoneId: UUID });
                if (user) {
                    clients[clientId] = user.username;
                    client.publish(UUID.substring(0, 5), 'ok');
                } else {
                    client.publish(UUID.substring(0, 5), 'UUID ne obstaja');
                }
                break;
            }

            case 'imageRegister': {
                if (trenutnaRegistracija.id === "") {
                    trenutnaRegistracija.id = clientId;
                }
                if (clientId === trenutnaRegistracija.id && trenutnaRegistracija.slike < 20) {
                    trenutnaRegistracija.slike++;
                    fs.writeFile(path.join(orvInputDir, `${trenutnaRegistracija.slike - 1}.jpg`), message, err => {
                        if (err) console.error('Napaka pri shranjevanju slike', err);
                    });
                    console.log(`Slika ${trenutnaRegistracija.slike} registracijo ${trenutnaRegistracija.id}`);
                } else {
                    client.publish(clients[clientId], 'ok');
                    console.log('Zasedeno');
                }
                break;
            }

            case 'imageLogin': {
                fs.writeFile(path.join(inputLoginDir, 'test.jpg'), message, err => {
                    if (err) console.error('Napaka slike za login', err);
                    else console.log('✅ Slika za login shranjena');
                });
                const pythonCmd = fs.existsSync('/usr/bin/python3') ? 'python3' : 'python';
                const scriptPath = path.join(__dirname, 'orv', 'testServer.py');
                const process = exec(`${pythonCmd} "${scriptPath}"`);

                process.stdout.on('data', (data) => {
                    console.log(`Python stdout: ${data}`);
                    if (data === "True\n") {
                        client.publish(clients[clientId], 'ok');
                        avtentikacija = clients[clientId];
                        avtentikacijaDate = new Date();
                    } else {
                        client.publish(clients[clientId], 'Napaka pri prijavi');
                    }
                });

                process.stderr.on('data', (data) => {
                    console.error(`Napaka: ${data}`);
                });

                process.on('close', (code) => {
                    console.log(`Proces zaključen z izhodno kodo ${code}`);
                });
                break;
            }

            case 'QR': {
                const { qr, lat, lon, light } = JSON.parse(message.toString());
                const newProduct = new Product({ qrcode: qr, latitude: lat, longitude: lon, light });
                const user = clients[clientId];

                await newProduct.save();
                await User.findOneAndUpdate({ username: user }, { $push: { products: newProduct._id } });

                if (ws?.broadcastToAll) {
                    ws.broadcastToAll(JSON.stringify({
                        type: 'qr',
                        data: { qrcode: qr, latitude: lat, longitude: lon, light }
                    }));
                }
                break;
            }
        }
    } catch (err) {
        console.error(`Napaka pri obdelavi sporočila za temo "${topic}":`, err);
    }
});

module.exports = {
    clients,
    activeClients,
    avtentikacija,
    avtentikacijaDate
};
