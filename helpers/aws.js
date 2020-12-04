const AWS = require('aws-sdk')

AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: process.env.AWS_REGION
})

const sns = new AWS.SNS()

module.exports.snsSendSms = (phone, message, subject = null) => new Promise((resolve, reject) => {
  sns.publish({
    PhoneNumber: phone,
    Subject: subject,
    Message: message,
    MessageStructure: 'string'
  }, (err, data) => {
    if (err) {
      reject(err)
    } else {
      resolve(data)
    }
  })
})
