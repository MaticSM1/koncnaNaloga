const express = require('express');
const mosca = require('mosca');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 3000;


const uri = process.env.MONGO_URI

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



//! EXPRESS  
app.use(express.json());

app.use('/public', express.static(__dirname + '/sites/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/sites/main.html');
});

app.get('/ping', (req, res) => {
    console.log('Ping');
    res.send('Pong!');
})

app.listen(port, () => {
    console.log(`Server na http://localhost:${port}`);
});


//! REGISTER


app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }
    try {
        const db = client.db('users');
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already exists' });
        }
        await db.collection('users').insertOne({ email, password });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const db = client.db('users');
        const user = await db.collection('users').findOne({ username });
        if (user && user.password === password) {
            res.status(200).json({ message: 'Login successful' });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});



//! MQTT


const mqttSettings = {
    port: 1888
};

const mqttServer = new mosca.Server(mqttSettings);

mqttServer.on('ready', () => {
    console.log('MQTT port 1883');
});

mqttServer.on('clientConnected', (client) => {
    console.log('Povezna nov:', client.id);
});

mqttServer.on('published', (packet, client) => {
    console.log('Published:', packet.topic, packet.payload.toString());
});