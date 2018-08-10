'use strict'

const moment = require('moment-timezone')

module.exports = class {
  constructor(TIMEZONE) {
    this.TIMEZONE = TIMEZONE || 'America/Caracas',
    this.DATE = moment().tz(this.TIMEZONE),
    this.FORMAT_DATE = this.DATE.format('DD-MM-YYYY HH.mm.ss A')
    this.FORMAT_TZ = this.TIMEZONE.replace('/', '-')
  }
}
