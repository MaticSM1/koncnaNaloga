const mqtt = require('mqtt');
const brokerUrl = 'mqtt://z7.si:1883';

const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
    console.log('Povezan na MQTT strežnik');
    client.subscribe('test', (err) => {
        if (!err) {
            console.log('Naročen na temo "test"');
        }
    });
});

client.on('message', (topic, message) => {
    console.log(`sporočilo na temi ${topic}: ${message.toString()}`);
});

client.publish('test', 'Pozdravljen MQTT!');