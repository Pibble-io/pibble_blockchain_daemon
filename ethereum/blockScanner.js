const web3 = require('./index')
const pibbleTokenContract = require('./contracts').pibbleToken
const log = require('debug')('app:ethereum:scanner')
const { sleep, genUniqueTimeStamp } = require('../helpers/utils')
const {
  Blockchain,
  Wallet,
  ExternalTransaction,
  Balance
} = require('../models')

const {
  ETH_COIN_ID: EtherCoinId,
  PIB_ERC_COIN_ID: pibbleCoinId
} = process.env

const mainAccount = process.env.MAIN_ACCOUNT.toLowerCase()
const sleepTime = 5000;

module.exports = async () => {
  const model = await Blockchain.findOne({
    where: {
      symbol: 'ETH'
    }
  })
  while (1) {
    try {


      const currentBlockNumber = parseInt(await web3.eth.getBlockNumber())
      if (model.block_number < currentBlockNumber) {
        const blockNumber = model.block_number + 1
        const blockData = await web3.eth.getBlock(blockNumber, true)
  
        log('Current Block: System: %o, Ethereum: %o, TxCount: %o', blockNumber, currentBlockNumber, blockData.transactions.length)
  
        // Ether Deposit Transaction
        for (const tx of blockData.transactions) {
          if (parseInt(tx.value) > 0 && tx.from.toLowerCase() !== mainAccount) {
            const wallet = await Wallet.findOne({
              where: {
                address: tx.to,
                coin_id: EtherCoinId
              }
            })
            if (wallet) {
              const txCount = await ExternalTransaction.count({
                where: {
                  transaction_hash: tx.hash
                }
              })
              if (!txCount) {
                const value = web3.utils.fromWei(tx.value)
                await ExternalTransaction.create({
                  value: value,
                  from_address: tx.from,
                  to_address: tx.to,
                  type: 1,
                  transaction_hash: tx.hash,
                  block_number: blockNumber,
                  UserId: wallet.UserId,
                  CoinId: EtherCoinId,
                  unique_timestamp: genUniqueTimeStamp(),
                  status: 0
                })
  
                const balance = await Balance.getBalance(wallet.UserId, EtherCoinId)
                balance.value = parseFloat(balance.value) + parseFloat(value)
                await balance.save()
  
                log(`Deposit Ether Tx value: %o Ether, from: %o to: %o`, value, tx.from, tx.to)
              }
            }
          }
        }
  
        // check Pibble Token transfer events every 100 blocks
        if (blockNumber % 100 === 0) {
          await model.save() // save syncing status every 100 blocks
  
          const transferEvents = await pibbleTokenContract.getPastEvents('Transfer', {
            fromBlock: blockNumber - 99,
            toBlock: blockNumber
          })
  
          transferEvents.map(async event => {
            if (parseInt(event.returnValues.value) > 0) {
              const wallet = await Wallet.findOne({
                where: {
                  address: event.returnValues.to,
                  coin_id: pibbleCoinId
                }
              })
              if (wallet) {
                const txCount = await ExternalTransaction.count({
                  where: {
                    transaction_hash: event.transactionHash
                  }
                })
                if (!txCount) {
                  const value = web3.utils.fromWei(String(event.returnValues.value))
                  await ExternalTransaction.create({
                    value: value,
                    from_address: event.returnValues.from,
                    to_address: event.returnValues.to,
                    type: 1,
                    transaction_hash: event.transactionHash,
                    block_number: event.blockNumber,
                    UserId: wallet.UserId,
                    CoinId: pibbleCoinId,
                    unique_timestamp: genUniqueTimeStamp(),
                    status: 0
                  })
  
                  const balance = await Balance.getBalance(wallet.UserId, pibbleCoinId)
                  balance.value = parseFloat(balance.value) + parseFloat(value)
                  await balance.save()
  
                  log('Deposit PIB_ERC Tx value: %o PIB, from: %o to: %o', value, event.returnValues.from, event.returnValues.to)
                }
              }
            }
          })
        }
  
        model.block_number = blockNumber
        // await model.save()
        //update blocknumber when system catch current number
        if(currentBlockNumber == model.block_number){
          await model.save()
          log('System scan all ETH block %o', model.block_number );

        }
      } else {
        // await sleep(5)
        await sleep(2000) // sleep 5 seconds
      }      
    } catch (error) {
      console.log(error)
      // log('Restart after %o seconds', sleepTime)
     console.log("ETH blockscanner restart after 5 second")
      await sleep(sleepTime)
    }

  }
}
