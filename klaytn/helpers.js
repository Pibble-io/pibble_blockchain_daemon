const contracts = require('./contracts')
const caver = require('./index')
const wallets = require('./wallets')
const sendSMS = require('../helpers/aws').snsSendSms
const log = require('debug')('app:klaytn')

const {
  ALERT_PHONE_NUMBER: alertPhoneNumber
} = process.env

module.exports.depositKlay = async (privateKey) => {
  const senderAccount = caver.klay.accounts.privateKeyToAccount(privateKey)

  const pebValue = await this.getKlayBalance(senderAccount.address)
  if (pebValue.isZero()) {
    log('No KLAY balance in %o', senderAccount.address)
    return false
  }

  // get the current gas price (wei)
  const gasPrice = parseInt(await caver.klay.getGasPrice())

  const { rawTransaction: senderRawTransaction } = await senderAccount.signTransaction({
    type: 'FEE_DELEGATED_VALUE_TRANSFER',
    from: senderAccount.address,
    to: wallets.mainAccount.address,
    value: pebValue,
    gas: '300000',
    gasPrice: gasPrice
  })

  const receipt = await caver.klay.sendTransaction({
    senderRawTransaction: senderRawTransaction,
    feePayer: wallets.feePayerAccount.address
  })

  return receipt.transactionHash
}

module.exports.withdrawKlay = async (recipientAddress, value) => {
  const pebValue = new caver.utils.BN(caver.utils.toPeb(String(value), 'KLAY'))
  const mainAccountBalance = await this.getKlayBalance(wallets.mainAccount.address)

  if (mainAccountBalance.gte(pebValue)) {
    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_VALUE_TRANSFER',
      from: wallets.mainAccount.address,
      to: recipientAddress,
      value: pebValue,
      gas: '300000'
    }, wallets.mainAccount.privateKey)

    const receipt = await caver.klay.sendTransaction({
      senderRawTransaction: senderRawTransaction,
      feePayer: wallets.feePayerAccount.address
    })

    return receipt.transactionHash
  } else {
    sendSMS(alertPhoneNumber, `System Wallet has insufficient KLAY balance. System Wallet Balance: ${caver.utils.fromPeb(mainAccountBalance, 'KLAY')} KLAY, Requested Withdrawal Value: ${parseFloat(value)} KLAY `)
  }

  return false
}

module.exports.depositPIBToken = async (privateKey) => {

  const senderAccount = caver.klay.accounts.privateKeyToAccount(privateKey)

  const pebValue = await this.getPIBBalance(senderAccount.address)

  if (pebValue.isZero()) {
    log('No PIBK balance in %o', senderAccount.address)
    return false
  }

  const txData = contracts.pibbleToken.methods.transfer(wallets.mainAccount.address, pebValue.toString()).encodeABI()

  const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
    type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
    from: senderAccount.address,
    to: contracts.pibbleToken.options.address,
    gas: '300000',
    data: txData,
    value: 0
  }, privateKey)

  const receipt = await caver.klay.sendTransaction({
    senderRawTransaction: senderRawTransaction,
    feePayer: wallets.feePayerAccount.address
  })

  return receipt.transactionHash
}

module.exports.withdrawToken = async (recipientAddress, value) => {
  const pebValue = caver.utils.toPeb(String(value), 'KLAY')
  const mainAccountBalance = await this.getPIBBalance(wallets.mainAccount.address)

  if (mainAccountBalance.gte(new caver.utils.BN(pebValue))) {
    const txData = contracts.pibbleToken.methods.transfer(recipientAddress, pebValue).encodeABI()

    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: wallets.mainAccount.address,
      to: contracts.pibbleToken.options.address,
      gas: '300000',
      data: txData,
      value: 0
    }, wallets.mainAccount.privateKey)

    const receipt = await caver.klay.sendTransaction({
      senderRawTransaction: senderRawTransaction,
      feePayer: wallets.feePayerAccount.address
    })

    return receipt.transactionHash
  } else {
    sendSMS(alertPhoneNumber, `System Wallet has insufficient PIBK balance. System Wallet Balance: ${caver.utils.fromPeb(mainAccountBalance, 'KLAY')} PIBK, Requested Withdrawal Value: ${parseFloat(value)} PIBK `)
  }

  return false
}

module.exports.getKlayBalance = async (address) => {
  const balance = await caver.klay.getBalance(address)
  return new caver.utils.BN(balance)
}

module.exports.getPIBBalance = async (address) => {
  const balance = await contracts.pibbleToken.methods.balanceOf(address).call()
  return new caver.utils.BN(balance)
}
