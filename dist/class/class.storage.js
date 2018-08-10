'use strict'

module.exports = class {
  constructor(DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, DB_NAME) {
    this.DB_HOST = DB_HOST || 'localhost',
    this.DB_USER = DB_USER || '',
    this.DB_PASSWORD = DB_PASSWORD || '',
    this.DB_PORT = DB_PORT || 3306,
    this.DB_NAME = DB_NAME || ''
  }
}
