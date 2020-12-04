const caver = require('./index')
const log = require('debug')('app:klaytn:wallet')

const mainAccount = caver.klay.accounts.wallet.add(process.env.KLAY_MAIN_WALLET_PK)
const feePayerAccount = caver.klay.accounts.wallet.add(process.env.KLAY_FEE_PAYER_WALLET_PK, process.env.KLAY_FEE_PAYER_WALLET)

log('Klaytn System wallet was added: %o', mainAccount.address)
log('Klaytn Fee Payer wallet was added: %o', feePayerAccount.address)

module.exports.mainAccount = mainAccount
module.exports.feePayerAccount = feePayerAccount
