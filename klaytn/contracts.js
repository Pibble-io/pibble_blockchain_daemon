var caver = require('./index')
// var tokenABI = require('./abi/krc20.json')
var tokenABI = require('./abi/krc20_new.json')

exports.pibbleToken = new caver.klay.Contract(tokenABI, process.env.PIBBLE_KLAYTN_TOKEN_ADDRESS)
