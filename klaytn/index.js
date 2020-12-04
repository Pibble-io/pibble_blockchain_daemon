const Caver = require('caver-js')
const log = require('debug')('app:klaytn')

const {
  KLAY_NODE_URL: nodeUrl
} = process.env

// connect ken node
const caver = new Caver(nodeUrl)
caver.klay.net.getId().then((id) => {
  log('Klaytn Network ID: %o', id)
})

module.exports = caver
