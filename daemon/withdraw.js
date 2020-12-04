const {
  Coin,
  ExternalTransaction,
  sequelize
} = require('../models')

// const {
//   withdrawEther,
//   withdrawToken
// } = require('../ethereum/helpers')

const klaytnHelper = require('../klaytn/helpers')
const etherHelper = require('../ethereum/helpers')

var log = require('debug')('app:daemon:withdraw')

module.exports = async function WithdrawMonitor () {
  log('checking withdrawal requests...')
  const requests = await ExternalTransaction.findAll({
    include: [{
      model: Coin,
      where: {pending_withdraw: 0}
    }],
    where: {
      type: 0,
      status: 0
    }
  })

  for (const item of requests) {
    try {
      // const balance = await getBalance(item.user_id, item.coin_id)
      const balance = 0
      log(`UserId=${item.UserId}, CoindId=${item.CoinId}, Real Balance=${balance}`)

      if (balance < 0) {
        item.status = 2
        await item.save()
      } else {
        let txHash
        const value = parseFloat(item.value)
        if (item.Coin.symbol === 'ETH') {
          txHash = await etherHelper.withdrawEther(item.to_address, item.value)
        } else if (item.Coin.symbol === 'PIB') {
          txHash = await etherHelper.withdrawToken(item.to_address, item.value)
        } else if (item.Coin.symbol === 'BTC') {
          // txHash = await withdrawBitcoin(item.to_address, item.value)
        } else if (item.Coin.symbol === 'KLAY') {
          txHash = await klaytnHelper.withdrawKlay(item.to_address, item.value)
        } else if (item.Coin.symbol === 'PIBK') {
          txHash = await klaytnHelper.withdrawToken(item.to_address, item.value)
        } else {
          log(`fail - unsupported coin: recipient: ${item.to_address}, value: ${value} ${item.Coin.symbol}`)
          continue
        }

        if (!txHash) {
          log(`fail - tx error: recipient: ${item.to_address}, value: ${value} ${item.Coin.symbol}`)
          continue
        }

        item.transaction_hash = txHash
        item.status = 1
        await item.save()
        log(`success - tx hash: ${txHash}, recipient: ${item.to_address}, value: ${value} ${item.Coin.symbol}`)
      }
    } catch (error) {
      log(`error - ${error.message} : ${item.Coin.symbol}, recipient: ${item.to_address}, value: ${item.value}`)
    }
  }
}

/*
async function getBalance (userId, coinId) {
  const res = await sequelize.query(`
    SELECT
        (SELECT	SUM(CASE	WHEN to_coin_id = :coinId THEN to_value
                        WHEN from_coin_id = :coinId THEN -from_value
                        ELSE 0
                END)
        FROM	exchange_transactions
        WHERE	user_id = :userId) +

        (SELECT	SUM(CASE WHEN type = 1 THEN value
                ELSE -value END)
        FROM	external_transactions
        WHERE	user_id = :userId) +

        (SELECT	SUM(CASE	WHEN to_user_id = :userId THEN value * (1 - fee * 0.01)
                        WHEN from_user_id = :userId THEN -value
                        ELSE 0
                END)
        FROM	goods_transactions

        WHERE	coin_id = :coinId) +
        
        (SELECT	SUM(value)
        FROM	airdrops
        WHERE	user_id = :userId
        AND		coin_id = :coinId) +

        (SELECT	SUM(CASE	WHEN to_user_id = :userId THEN value
                            WHEN from_user_id = :userId THEN -value
                            ELSE 0
                    END)
        FROM	internal_transactions
        WHERE	coin_id = :coinId) AS balance
  `, {
    replacements: {
      coinId: coinId,
      userId: userId
    },
    type: sequelize.QueryTypes.SELECT
  })

  return res[0].balance
}
*/