const mqtt = require('mqtt');

// Nastavi povezavo na tvoj MQTT strežnik
const brokerUrl = 'mqtt://localhost:1883'; // Spremeni po potrebi
const topic = 'test/topic';

const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
    console.log('Povezan na MQTT strežnik');
    client.subscribe(topic, (err) => {
        if (!err) {
            console.log(`Naročen na temo: ${topic}`);
            // Pošlji testno sporočilo
            client.publish(topic, 'Pozdrav z MQTT testa!');
        }
    });
});

client.on('message', (topic, message) => {
    console.log(`Prejeto sporočilo na temi "${topic}": ${message.toString()}`);
    client.end();
});

client.on('error', (err) => {
    console.error('Napaka:', err);
    client.end();
});