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
    } finally {
        await client.close();
    }
}
run().catch(console.dir);



//! EXPRESS  
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/main.html');
});

app.get('/ping', (req, res) => {
    console.log('Ping');
    res.send('Pong!');
})

app.listen(port, () => {
    console.log(`Server na http://localhost:${port}`);
});


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