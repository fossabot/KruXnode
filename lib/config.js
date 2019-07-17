const SHA512 = require('crypto-js/sha512');
const RIPEMD160 = require('crypto-js/ripemd160');
const FS = require('fs');

const difficulty = 4;
const name = 'KruX Network';
const version = 'v0.1.0';
const standardNodes = [
    {
        address: '127.0.0.1',
        port: 3003
    }
];

const networkIdHash = SHA512(RIPEMD160(difficulty.toString() + name.toUpperCase() + version.toUpperCase() + FS.readFileSync('./app.js', { encoding: 'UTF8' }))).toString();

module.exports = {
    difficulty: difficulty,
    name: name,
    version: version,
    standardNodes: standardNodes,
    networkIdHash: networkIdHash
};
