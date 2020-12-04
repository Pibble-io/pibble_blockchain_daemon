var caver = require('./index')
var tokenABI = require('./abi/krc20.json')

exports.pibbleToken = new caver.klay.Contract(tokenABI, process.env.OLD_PIBBLE_KLAYTN_TOKEN_ADDRESS)
