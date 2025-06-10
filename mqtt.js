const aedes = require('aedes')({ decodePayload: false });
const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Product = require('./models/product');
const User = require('./models/user');

const mqttPort = 1883;
let clients = [];
let activeClients = [];
let trenutnaRegistracija = { id: "", timestamp: Date.now(), slike: 0, status: "" };
let avtentikacija = "";
let avtentikacijaDate = new Date();
const bcrypt = require('bcrypt');

let ws;
try {
    ws = require("./ws.js")
    ws.createWebSocketServer(8077);
}
catch (e) {
    console.error("Napaka ws.js:", e);
}

let steviloAktivnih1 = 0; // enostaven način
let steviloAktivnih2 = 0; // naš način

const mqttServer = net.createServer(aedes.handle);


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


aedes.on('publish', (packet, client) => {


    if (!packet.topic || packet.topic.startsWith('$SYS')) return;

    console.log('📨 Objavljeno:', packet.topic);
    console.log('🧪 Buffer:', Buffer.isBuffer(packet.payload));
    console.log('🔢 Velikost:', packet.payload.length);

    const clientId = client ? client.id : 'neznano';
    console.log('👤 clientId:', clientId);
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
        console.log('registracija:', username, password, UUID);
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
                    console.log("registracija uspesna")

                    const hashedPassword = await bcrypt.hash(password, 10);



                    const newUser = new User({
                        username,
                        password: hashedPassword,
                        login2f: false,
                        phoneId: UUID,
                    });
                    await newUser.save();

                    clients[clientId] = username;
                    console.log('Uporabnik registriran:', username);
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
                        await User.updateOne(
                            { username: username },
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
                const user = await User.findOne({ phoneId: UUID });
                if (user) {
                    clients[clientId] = user.username;
                    console.log('Najden uporabnik:', user.username);
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
            aedes.publish({
                topic: clients[clientId],
                payload: Buffer.from('ok'),
                qos: 0,
                retain: false
            });
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

        const pythonCmd = fs.existsSync('/usr/bin/python3') ? 'python3' : 'python';
        const scriptPath = path.join(__dirname, 'orv', 'testServer.py');
        const process = exec(`${pythonCmd} "${scriptPath}"`);

        process.stdout.on('data', (data) => {
            console.log(`Python stdout: ${data}`);
            if (data == "True\n") {
                console.log(clients[clientId]);
                aedes.publish({
                    topic: clients[clientId],
                    payload: Buffer.from('ok'),
                    qos: 0,
                    retain: false
                });
                avtentikacija = clients[clientId];
                avtentikacijaDate = new Date();
                console.log('Prijava uspešna:', avtentikacija);
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
            const { qr, lat, lon, light } = JSON.parse(packet.payload.toString());
            console.log(qr, lat, lon, light);

            const newProduct = new Product({
                qrcode: qr,
                latitude: lat,
                longitude: lon,
                light: light
            });

            const user = clients[clientId];

            newProduct.save()
                .then(savedProduct => {
                    console.log('Product saved:', savedProduct);

                    return User.findOneAndUpdate(
                        { username: user },
                        { $push: { products: savedProduct._id } },
                        { new: true }
                    );
                })
                .then(updatedUser => {
                    if (updatedUser) {
                        console.log('Product ID added to user:', updatedUser.username);
                    } else {
                        console.log('User not found');
                    }
                })
                .catch(err => {
                    console.error('Error:', err);
                });


            try {
                if (ws && ws.broadcastToAll) {
                    ws.broadcastToAll(JSON.stringify({
                        type: 'qr',
                        data: {
                            qrcode: qr,
                            latitude: lat,
                            longitude: lon,
                            light: light
                        }
                    }));
                }
            } catch (e) {
                console.error('Napaka ws', e);
            }

        } catch (err) {
            console.error('Napaka sprejema', err);
        }

    }
});


module.exports = {
    clients,
    activeClients,
    avtentikacija,
    avtentikacijaDate
};