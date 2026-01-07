const net = require('net');

const HOST = '192.168.1.91'; 
const PORT = 3000;            


const server = net.createServer((conn) => {
    console.log(`Povezan s ${conn.remoteAddress}:${conn.remotePort}`);
    
    conn.on('data', (data) => {
        console.log(`Prejeto: ${data.toString('utf-8')}`);
   
        conn.write('Received\n');
    });
    
    conn.on('end', () => {
        console.log('Klient se je odklopil');
    });
    
    conn.on('error', (err) => {
        console.error('Napaka:', err);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Server posluša na ${HOST}:${PORT}`);
});
