const caver = require('./index')
const pibbleTokenContract = require('./contracts').pibbleToken
const log = require('debug')('app:klaytn:scanner')
const { sleep, genUniqueTimeStamp } = require('../helpers/utils')
const {
  Blockchain,
  Wallet,
  ExternalTransaction,
  Balance
} = require('../models')

const {
  KLAY_COIN_ID: klayCoinId,
  PIB_KRC_COIN_ID: pibbleKCoinId
} = process.env

const sleepTime = 5000;

module.exports = async () => {
  const model = await Blockchain.findOne({
    where: {
      symbol: 'KLAY'
    }
  })
  while (1) {
    try {
      const currentBlockNumber = parseInt(await caver.klay.getBlockNumber())
      if (model.block_number < currentBlockNumber) {
        const blockNumber = model.block_number + 1
        const blockData = await caver.klay.getBlock(blockNumber, true)
  
        // Klay Deposit Transaction
        for (const tx of blockData.transactions) {
          if (parseInt(tx.value) > 0) {
            const wallet = await Wallet.findOne({
              where: {
                address: tx.to,
                coin_id: klayCoinId
              }
            })
            if (wallet) {
              const txCount = await ExternalTransaction.count({
                where: {
                  transaction_hash: tx.hash
                }
              })
              if (!txCount) {
                const value = caver.utils.fromPeb(tx.value)
                await ExternalTransaction.create({
                  value: value,
                  from_address: tx.from,
                  to_address: tx.to,
                  type: 1,
                  transaction_hash: tx.hash,
                  block_number: blockNumber,
                  UserId: wallet.UserId,
                  CoinId: klayCoinId,
                  unique_timestamp: genUniqueTimeStamp(),
                  status: 0
                })
  
                const balance = await Balance.getBalance(wallet.UserId, klayCoinId)
                balance.value = parseFloat(balance.value) + parseFloat(value)
                await balance.save()
  
                log(`Deposit Klay Tx value: %o Klay, from: %o to: %o`, value, tx.from, tx.to)
              }
            }
          }
        }
  
        // check Pibble Token transfer events every 100 blocks
        if (blockNumber % 100 === 0) {
          await model.save() // save syncing status every 100 blocks
  
          // show status every 100 blocks
          log('Current Block: System: %o, Klaytn: %o, TxCount: %o', blockNumber, currentBlockNumber, blockData.transactions.length)
  
          const transferEvents = await pibbleTokenContract.getPastEvents('Transfer', {
            fromBlock: blockNumber - 99,
            toBlock: blockNumber
          })
  
          transferEvents.map(async event => {
            if (parseInt(event.returnValues.value) > 0) {
              const wallet = await Wallet.findOne({
                where: {
                  address: event.returnValues.to,
                  coin_id: pibbleKCoinId
                }
              })
              if (wallet) {
                const txCount = await ExternalTransaction.count({
                  where: {
                    transaction_hash: event.transactionHash
                  }
                })
                if (!txCount) {
                  const value = caver.utils.fromPeb(event.returnValues.value)
                  await ExternalTransaction.create({
                    value: value,
                    from_address: event.returnValues.from,
                    to_address: event.returnValues.to,
                    type: 1,
                    transaction_hash: event.transactionHash,
                    block_number: event.blockNumber,
                    UserId: wallet.UserId,
                    CoinId: pibbleKCoinId,
                    unique_timestamp: genUniqueTimeStamp(),
                    status: 0
                  })
  
                  const balance = await Balance.getBalance(wallet.UserId, pibbleKCoinId)
                  balance.value = parseFloat(balance.value) + parseFloat(value)
                  await balance.save()
  
                  log('Deposit PIB_KRC Tx value: %o PIB, from: %o to: %o', value, event.returnValues.from, event.returnValues.to)
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
          log('System scan all KLAY block %o', model.block_number );
        }        
      } else {
        // await sleep(30)
        await sleep(1000) // sleep 1 second
      }
    } catch (error) {
      console.log(error)
      // log('Restart after %o seconds', sleepTime)
     console.log("KLAY blockscanner restart after 5 second")
      await sleep(sleepTime)
    }

  }
}
