const WebSocket = require('ws');

function createWebSocketServer(port = 8080) {
    const wss = new WebSocket.Server({ port });

    wss.on('connection', function connection(ws) {
        console.log('Novi povezan');

        ws.on('close', function close() {
            console.log('odvbezan');
        });

    });

    wss.broadcast = function broadcast(data) {
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    };

    console.log(`WS: ws://localhost:${port}`);
    return wss;
}

function broadcastToAll(server, data) {
    server.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

module.exports = { createWebSocketServer, broadcastToAll };