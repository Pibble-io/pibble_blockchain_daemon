const web3 = require('./index')
const contracts = require('./contracts')
const log = require('debug')('app:ethereum')
const sendSMS = require('../helpers/aws').snsSendSms

const {
  MAIN_ACCOUNT: mainAccount,
  MAIN_ACCOUNT_PASSWORD: mainAccountPassword,
  ALERT_PHONE_NUMBER: alertPhoneNumber
} = process.env

exports.transferEther = async (privateKey, recipientAddress, value) => {
  const senderAccount = web3.eth.accounts.wallet.add(privateKey)

  const weiValue = web3.utils.toWei(String(value), 'ether')

  // get the estimation of gas
  const gasLimit = await web3.eth.estimateGas({
    from: senderAccount.address,
    to: recipientAddress,
    value: weiValue
  })
  // get the current gas price (wei)
  const gasPrice = await web3.eth.getGasPrice()

  const txHash = await new Promise((resolve, reject) => {
    web3.eth.sendTransaction({
      from: senderAccount.address,
      to: recipientAddress,
      value: weiValue,
      gas: gasLimit,
      gasPrice: gasPrice
    })
      .on('transactionHash', resolve)
      .on('receipt', receipt => {
        // console.log("receipt: ", receipt);
      })
      .on('confirmation', function (confirmationNumber, receipt) {
        // console.log("confirmation", receipt);
      })
      .on('error', error => {
        reject(error)
      }) // If a out of gas error, the second parameter is the receipt.
  })

  web3.eth.accounts.wallet.remove(senderAccount.index)

  return txHash
}

exports.depositEther = async (privateKey) => {
  const senderAccount = web3.eth.accounts.wallet.add(privateKey)

  const weiValue = await this.getETHBalance(senderAccount.address)

  // get the estimation of gas
  const gasLimit = parseInt(await web3.eth.estimateGas({
    from: senderAccount.address,
    to: mainAccount,
    value: weiValue
  }))
  // get the current gas price (wei)
  const gasPrice = parseInt(await web3.eth.getGasPrice())

  const gas = web3.utils.toBN(gasLimit * gasPrice)

  const txHash = await new Promise((resolve, reject) => {
    web3.eth.sendTransaction({
      from: senderAccount.address,
      to: mainAccount,
      value: weiValue.sub(gas),
      gas: gasLimit,
      gasPrice: gasPrice
    })
      .on('transactionHash', resolve)
      .on('receipt', receipt => {
        // console.log("receipt: ", receipt);
      })
      .on('confirmation', function (confirmationNumber, receipt) {
        // console.log("confirmation", receipt);
      })
      .on('error', error => {
        reject(error)
      }) // If a out of gas error, the second parameter is the receipt.
      .catch(ex => {
        reject(ex)
      })
  })

  web3.eth.accounts.wallet.remove(senderAccount.index)

  return txHash
}

exports.withdrawEther = async (recipientAddress, value) => {
  const weiValue = new web3.utils.BN(web3.utils.toWei(String(value), 'ether'))
  const mainWalletBalance = await this.getETHBalance(mainAccount)

  if (mainWalletBalance.gte(weiValue)) {
    await web3.eth.personal.unlockAccount(mainAccount, mainAccountPassword, null)

    // get the estimation of gas
    const gasLimit = await web3.eth.estimateGas({
      from: mainAccount,
      to: recipientAddress,
      value: weiValue
    })
    // get the current gas price (wei)
    const gasPrice = await web3.eth.getGasPrice()

    const txHash = await new Promise((resolve, reject) => {
      web3.eth.sendTransaction({
        from: mainAccount,
        to: recipientAddress,
        value: weiValue,
        gas: gasLimit,
        gasPrice: gasPrice
      })
        .on('transactionHash', resolve)
        .on('receipt', receipt => {
          // console.log("receipt: ", receipt);
        })
        .on('confirmation', function (confirmationNumber, receipt) {
          // console.log("confirmation", receipt);
        })
        .on('error', error => {
          reject(error)
        }) // If a out of gas error, the second parameter is the receipt.
    })
    return txHash
  } else {
    sendSMS(alertPhoneNumber, `System Wallet has insufficient Ethereum balance. System Wallet Balance: ${web3.utils.fromWei(mainWalletBalance, 'ether')} ETH, Requested Withdrawal Value: ${parseFloat(value)} ETH `)
  }

  return false
}

exports.transferToken = async (privateKey, recipientAddress, value) => {
  const senderAccount = web3.eth.accounts.wallet.add(privateKey)

  const weiValue = web3.utils.toWei(String(value), 'ether')

  // get the estimation of gas
  const gasLimit = await contracts.pibbleToken.methods.transfer(recipientAddress, weiValue).estimateGas({
    from: senderAccount.address
  })
  // get the current gas price (wei)
  const gasPrice = await web3.eth.getGasPrice()

  const txHash = await new Promise((resolve, reject) => {
    contracts.pibbleToken.methods.transfer(recipientAddress, weiValue)
      .send({
        from: senderAccount.address,
        to: contracts.pibbleToken.options.address,
        value: 0,
        gas: gasLimit,
        gasPrice: gasPrice
      })
      .on('transactionHash', resolve)
      .on('receipt', function (receipt) {
        // console.log("receipt: ", receipt);
      })
      .on('confirmation', function (confirmationNumber, receipt) {
        // console.log("confirmation", receipt);
      })
      .on('error', reject) // If a out of gas error, the second parameter is the receipt.
  })

  web3.eth.accounts.wallet.remove(senderAccount.index)

  return txHash
}

exports.depositPIBToken = async (privateKey) => {
  const senderAccount = web3.eth.accounts.wallet.add(privateKey)

  const weiValue = await this.getPIBBalance(senderAccount.address)

  if (weiValue.isZero()) {
    log('No funds in %o', senderAccount.address)
    return false
  }

  // get the estimation of gas
  const gasLimit = parseInt(await contracts.pibbleToken.methods.transfer(mainAccount, weiValue.toString()).estimateGas({
    from: senderAccount.address
  }))
  // get the current gas price (wei)
  const gasPrice = parseInt(await web3.eth.getGasPrice()) + parseInt(web3.utils.toWei('2', 'gwei'));

  await web3.eth.getGasPrice().then((averageGasPrice) => {
    console.log("get from network gas price: " + averageGasPrice);
  }).
  catch(console.error);

  const gas = gasLimit * gasPrice

  await web3.eth.personal.unlockAccount(mainAccount, mainAccountPassword, null)


  console.log(`ERC PIB collecting : to = ${senderAccount.address} , gas = ${gas} , gasPrice = ${gasPrice} `)

  web3.eth.sendTransaction({
    from: mainAccount,
    to: senderAccount.address,
    value: gas,
    gas: 21000,
    gasPrice: gasPrice
  })
    .then(receipt => {
      if (receipt.status) {
        log('Fill Gas for deposit PIB Tx: ', receipt)
        return contracts.pibbleToken.methods.transfer(mainAccount, weiValue.toString())
          .send({
            from: senderAccount.address,
            to: contracts.pibbleToken.options.address,
            value: 0,
            gas: gasLimit,
            gasPrice: gasPrice
          })
      }

      log('Error: Send Ether Transaction was reverted')
    })
    .then(receipt => {
      log('Deposit PIB Tx: ', receipt.transactionHash)
    })
    .catch(error => {
      console.log("What?? ",error)
      log(error)
    })
    .finally(() => {
      web3.eth.accounts.wallet.remove(senderAccount.index)
    })

  return true
}

exports.withdrawToken = async (recipientAddress, value) => {
  const weiValue = new web3.utils.BN(web3.utils.toWei(String(value), 'ether'))
  const mainWalletBalance = await this.getPIBBalance(mainAccount)

  if (mainWalletBalance.gte(weiValue)) {
    await web3.eth.personal.unlockAccount(mainAccount, mainAccountPassword, null)
    // get the estimation of gas
    const gasLimit = await contracts.pibbleToken.methods.transfer(recipientAddress, weiValue.toString()).estimateGas({
      from: mainAccount
    })
    // get the current gas price (wei)
    const gasPrice = await web3.eth.getGasPrice()

    console.log(`ERC PIB withdraw : to = ${contracts.pibbleToken.options.address} , gasLimit = ${gasLimit} , gasPrice = ${gasPrice} `)
    const txHash = await new Promise((resolve, reject) => {
      contracts.pibbleToken.methods.transfer(recipientAddress, weiValue.toString())
        .send({
          from: mainAccount,
          to: contracts.pibbleToken.options.address,
          value: 0,
          gas: gasLimit,
          gasPrice: gasPrice
        })
        .on('transactionHash', resolve)
        .on('receipt', function (receipt) {
          // log('withdraw PIB token receipt: ', receipt)
        })
        .on('confirmation', function (confirmationNumber, receipt) {
          // log("confirmation", receipt);
        })
        .on('error', reject) // If a out of gas error, the second parameter is the receipt.
    })

    return txHash
  } else {
    sendSMS(alertPhoneNumber, `System Wallet has insufficient PIB balance. System Wallet Balance: ${web3.utils.fromWei(mainWalletBalance, 'ether')} PIB, Requested Withdrawal Value: ${parseFloat(value)} PIB `)
  }

  return false
}

exports.transferTokenTxFee = async (address) => {
  // get the estimation of gas
  const gasLimit = parseInt(await contracts.pibbleToken.methods.transfer(address, 0).estimateGas({
    from: mainAccount
  }))
  // get the current gas price (wei)
  const gasPrice = parseInt(await web3.eth.getGasPrice())

  const gas = gasLimit * gasPrice

  await web3.eth.personal.unlockAccount(mainAccount, mainAccountPassword, null)

  const txHash = await new Promise((resolve, reject) => {
    web3.eth.sendTransaction({
      from: mainAccount,
      to: address,
      value: gas,
      gas: 21000,
      gasPrice: gasPrice
    })
      .on('transactionHash', resolve)
      .on('receipt', function (receipt) {
        log('Fill Gas for deposit PIB Tx for Samsung wallet : ', receipt.transactionHash)
      })
      .on('error', reject) // If a out of gas error, the second parameter is the receipt.
  })

  return txHash
}

exports.getETHBalance = async (address) => {
  const balance = await web3.eth.getBalance(address)
  return new web3.utils.BN(balance)
}

exports.getPIBBalance = async (address) => {
  const balance = await contracts.pibbleToken.methods.balanceOf(address).call()
  return new web3.utils.BN(balance)
}
