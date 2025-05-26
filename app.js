const express = require('express');
const mosca = require('mosca');

const app = express();
const port = 3000;

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