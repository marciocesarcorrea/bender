const socket = require('socket.io-client')(process.env.WSS_URL)
socket.on('connect', () => {
  console.log('connect')
})
module.exports = socket
