const express = require('express');
const mosca = require('mosca');
const session = require('express-session');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 3000;

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
        console.log("MongoDB connected!");
    } catch (err) {
        console.error("MongoDB connection error:", err);
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
app.use('/public', express.static(__dirname + '/sites/public'));


app.get('/', (req, res) => {
    if (req.session && req.session.email) {
        console.log('Prijavljen:', req.session.email);
        res.sendFile(__dirname + '/sites/portal.html');
    } else {
        console.log('Neprijavljen obiskovalec');
        res.sendFile(__dirname + '/sites/main.html');
    }
});

// Ping test
app.get('/ping', (req, res) => {
    console.log('Ping');
    res.send('Pong!');
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Napaka pri odjavi');
        }
        res.redirect('/');
    });
});

// Register
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email in geslo sta obvezna' });
    }
    try {
        const db = client.db('users');
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email že obstaja' });
        }
        await db.collection('users').insertOne({ email, password });
        req.session.email = email;
        res.status(201).json({ message: 'Uporabnik uspešno registriran' });
    } catch (err) {
        console.error('Napaka pri registraciji:', err);
        res.status(500).json({ message: 'Napaka strežnika', error: err.message });
    }
});

// Login
app.post('/login', async (req, res) => {
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

app.listen(port, () => {
    console.log(`HTTP port http://localhost:${port}`);
});


// MQTT
const mqttSettings = {
    port: 1883
};

const mqttServer = new mosca.Server(mqttSettings);

mqttServer.on('ready', () => {
    console.log('MQTT port 1883');
});

mqttServer.on('clientConnected', (client) => {
    console.log('Povezan odjemalec:', client.id);
});

mqttServer.on('published', (packet, client) => {
    console.log('Objavljeno:', packet.topic, packet.payload.toString());
});


