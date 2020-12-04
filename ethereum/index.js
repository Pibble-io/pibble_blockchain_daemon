var Web3 = require('web3')
const log = require('debug')('app:ethereum')

const {
  ETHEREUM_NODE_URL: nodeUrl
} = process.env

// connect ETH node
var web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl))
// var web3 = new Web3(new Web3.providers.WebsocketProvider(nodeUrl))

web3.eth.net.getNetworkType()
  .then(networkType => {
    log('Ethereum Network Type: %o', networkType)
  })
  .catch(ex => {
    log('cannot connect to Ethereum Node: %o', nodeUrl)
    log(ex)
  })
module.exports = web3
