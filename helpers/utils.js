/* eslint-disable no-undef */
/*
module.exports.msleep = n => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n)
}
module.exports.sleep = n => {
  this.msleep(n * 1000)
}
*/
module.exports.genUniqueTimeStamp = () => {
  return Math.floor(Date.now() / (120 * 1000))
}

module.exports.sleep = async ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
