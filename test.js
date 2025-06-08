const mqtt = require('mqtt');
//const brokerUrl = 'mqtt://z7.si:1883';
const brokerUrl = 'mqtt://localhost:1888';


const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
    console.log('Povezan na MQTT strežnik');
    client.subscribe('prijava', (err) => {
        if (!err) {
            console.log('Naročen na temo "prijava"');
        }
    });

    setTimeout(() => {
        client.publish('prijava', JSON.stringify({ ime: 'matic', geslo: 'test1' }));
    }, 1000); 
});

client.on('message', (topic, message) => {
    console.log(`sporočilo na temi ${topic}: ${message.toString()}`);
});