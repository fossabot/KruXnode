/* eslint-disable no-console */

const KruXcore = require('kruxcorelib');
const Express = require('express');
const BodyParser = require('body-parser');
const WebSocket = require('ws');
const Config = require('./lib/config');
const ReadLine = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

let nodes = [];

console.log(`Network id hash is ${Config.networkIdHash}`);

let blockchain = new KruXcore.Blockchain({ verbose: false, difficulty: Config.difficulty });


// CLI STUFF
ReadLine.on('line', async (input) => {
    let command = input.split(' ')[0];
    let cliargs = input.split(' ').splice(1) || '';

    switch (command) {
    case 'exit':
    case 'quit':
        process.exit();
        break;
    case 'connect':
        if (cliargs[0] && cliargs[1]) {
            console.log(`Connecting to ${cliargs[0]}:${cliargs[1]}`);
            addNode({ address: cliargs[0], port: cliargs[1] });
        }
        break;
    }
});

const rpcapi = Express(); // Initialize the RPC API
const p2papi = new WebSocket.Server({ // Initialize the P2P API
    port: process.env.P2P_PORT || 3003
}, () => {
    console.log(`-------- P2P API INITIALIZED ON PORT ${process.env.P2P_PORT || 3003} --------`);
});

// P2P API STUFF
p2papi.on('connection', (ws, req) => {
    ws.on('message', (msg) => {
        const msgJson = JSON.parse(msg);

        if (msgJson.networkIdHash === Config.networkIdHash) {
            console.log('Network ID hashes matched, continuing...');
            console.log(`Incoming message from ${req.connection.remoteAddress}}:${req.connection.remotePort}: ${JSON.stringify(msgJson.data)}`);

            switch (msgJson.data.action) {
            case 'authenticationStarted':
                console.log('Sending authenticationSuccess to node!');
                
                setTimeout(() => ws.send(JSON.stringify({
                    networkIdHash: Config.networkIdHash,
                    data: {
                        action: 'authenticationSuccess'
                    }
                })), 500);
                break;
            case 'authenticationSuccess':
                console.log('Authentication succeeded!');
                break;
            case 'authenticationFailed':
                console.log('Authentication failed!');
                break;
            }
        } else {
            console.log('Network ID hashes do not match, disconnecting...');

            setTimeout(() => ws.send(JSON.stringify({
                networkIdHash: Config.networkIdHash,
                data: {
                    action: 'authenticationFailed'
                }
            })), 500);
            ws.terminate();
        }
    });

    ws.on('close', () => console.log(`${req.connection.remoteAddress} disconnected`));

    console.log(`Incoming connection from ${req.connection.remoteAddress}:${req.connection.remotePort}!`);
});


// RPC API STUFF
rpcapi.use(BodyParser.json());

rpcapi.listen(process.env.RPC_PORT || 3002, () => {
    console.log(`-------- RPC API INITIALIZED ON PORT ${process.env.RPC_PORT || 3002} --------`);
});

for (const node of Config.standardNodes) {
    addNode(node);
}

function broadcastToNodes(ws, msg) {
    p2papi.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

function addNode(nodeData) {
    try {
        const newNode = new WebSocket(`ws://${nodeData.address}:${nodeData.port}`);
        
        newNode.on('open', () => newNode.send(JSON.stringify({
            networkIdHash: Config.networkIdHash,
            data: {
                action: 'authenticationStarted'
            }
        })));

        newNode.on('message', (msg) => {
            const msgJson = JSON.parse(msg);

            if (msgJson.networkIdHash === Config.networkIdHash) {
                console.log('Network ID hashes matched, continuing...');
                console.log(`Incoming message from ${nodeData.address}:${nodeData.port}: ${JSON.stringify(msgJson.data)}`);

                switch (msgJson.data.action) {
                case 'authenticationStarted':
                    console.log('Sending authenticationSuccess to node!');
                    
                    setTimeout(() => newNode.send(JSON.stringify({
                        networkIdHash: Config.networkIdHash,
                        data: {
                            action: 'authenticationSuccess'
                        }
                    })), 500);
                    break;
                case 'authenticationSuccess':
                    console.log('Authentication succeeded!');
                    break;
                case 'authenticationFailed':
                    console.log('Authentication failed!');
                    break;
                }
            } else {
                console.log('Network ID hashes do not match, disconnecting...');

                setTimeout(() => newNode.send(JSON.stringify({
                    networkIdHash: Config.networkIdHash,
                    data: {
                        action: 'authenticationFailed'
                    }
                })), 500);
                newNode.terminate();
            }
        });

        nodes.push(newNode);
    } catch (err) {
        console.error(`${nodeData.address}:${nodeData.port} errored: ${err}`);
    }
}