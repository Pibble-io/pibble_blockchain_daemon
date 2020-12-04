const klaytnHelper = require('../klaytn/helpers')
const etherHelper = require('../ethereum/helpers')
const log = require('debug')('app:daemon:depositCollector')

const {
  Wallet,
  ExternalTransaction,
  sequelize
} = require('../models')

const klayCoinId = parseInt(process.env.KLAY_COIN_ID)
const pibbleKRCCoinId = parseInt(process.env.PIB_KRC_COIN_ID)
const etherCoinId = parseInt(process.env.ETH_COIN_ID)
const pibbleERCCoindId = parseInt(process.env.PIB_ERC_COIN_ID)

module.exports = async () => {
  log('Collecting funds...')

  const transactions = await sequelize.query(`
    SELECT DISTINCT external_transactions.user_id, external_transactions.coin_id, external_transactions.to_address
    FROM external_transactions
    WHERE type = 1
    AND status = 0
    and exists (select 1 from coins c where c.id = external_transactions.coin_id and c.pending_deposit = 0) 
    ORDER BY external_transactions.coin_id
  `, {
    type: sequelize.QueryTypes.SELECT
  })

  for (const item of transactions) {
    let txHash
    try {
      const wallet = await Wallet.findOne({
        where: {
          coin_id: item.coin_id,
          user_id: item.user_id
        }
      })
      if (!wallet) {
        log(`error - wallet doesn't exist ${item.to_address}`)
        continue
      }
      log(`collecting funds from ${wallet.address}`)
      if (item.coin_id === klayCoinId) {
        txHash = await klaytnHelper.depositKlay(wallet.private_key)
        log(`Klay collecting tx was sent: ${txHash}`)
      } else if (item.coin_id === pibbleKRCCoinId) {
	      txHash = await klaytnHelper.depositPIBToken(wallet.private_key)
        log(`PIB_KRC collecting tx was sent: ${txHash}`)
      } else if (item.coin_id === etherCoinId) {
        txHash = await etherHelper.depositEther(wallet.private_key)
        log(`Ether collecting tx was sent: ${txHash}`)
      } else if (item.coin_id === pibbleERCCoindId) {
        txHash = await etherHelper.depositPIBToken(wallet.private_key)
        log(`PIB_ERC collecting tx was sent: ${txHash}`)
      }

      if (txHash) {
        await ExternalTransaction.update({
          status: 1
        }, {
          where: {
            type: 1,
            status: 0,
            user_id: item.user_id,
            coin_id: item.coin_id
          }
        })
      }
    } catch (ex) {
      log(ex)
    }
  }
}
