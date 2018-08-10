'use strict'

const mysqldump = require('mysqldump')

module.exports = class {
  constructor(STORAGE, SQL_PATH) {
    this.dump = {
      connection: {
        host: STORAGE['DB_HOST'],
        user: STORAGE['DB_USER'],
        port: STORAGE['DB_PORT'],
        password: STORAGE['DB_PASSWORD'],
        database: STORAGE['DB_NAME']
      },
      dumpToFile: `${SQL_PATH}`
    }
  }

  mysqlDump() {
    return mysqldump(this.dump)
  }
}
