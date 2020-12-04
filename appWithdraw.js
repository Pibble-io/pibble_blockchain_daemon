require('dotenv').config()
var CronJob = require('cron').CronJob
const log = require('debug')('app:cron')
const WithdrawMonitor = require('./daemon/withdraw')
const depositCollector = require('./daemon/depositCollector')
const KlaytnBlockScanner = require('./klaytn/blockScanner')
const EtherBlockScanner = require('./ethereum/blockScanner')

// check withdrawal request every 5 minutes
const withdrawalJob = new CronJob('*/5 * * * *', async () => {
  log('withdrawal monitor is running')
  await WithdrawMonitor()
})

// // collect deposit funds every 8 minutes
// const depositCollectJob = new CronJob('*/8 * * * *', async () => {
//   log('deposit fund collector is running')
//   await depositCollector()
// })

withdrawalJob.start()
// depositCollectJob.start()

// EtherBlockScanner()
// KlaytnBlockScanner()
