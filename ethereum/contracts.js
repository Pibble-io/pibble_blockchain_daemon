const web3 = require('./index')
const tokenABI = require('./abi/erc20.json')

exports.pibbleToken = new web3.eth.Contract(tokenABI, process.env.PIBBLE_TOKEN_ADDRESS)
