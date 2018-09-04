'use strict'

/* Server Params */
const ENV = process.env.NODE_ENV || process.argv[3] || 'production'
const BACKUP = process.env.BACKUP_ENV || process.argv[2]
/* Lodash Module */
const _ = require('lodash')
/* Services Classes and Schemas */
const TimeZoneClass = require('./class.timezone')
const ConnectionClass = require('./class.connection')
const ValidatorSchema = require('../schemas/schema.validator')
/* Log Module */
const Log = require('log')
const log = new Log('info')
/* File System Lib */
const fileSystem = require('../lib/fileSystem')
/* Zip Compress Module */
const targz = require('targz')
/* Serial promises Module */
const PromiSerial = require('promise-serial')
/* Validator Join Module */
const Joi = require('joi')

let config = {}

module.exports = class {
  constructor(jsConfig) {
    this.config = jsConfig || {}
    config = jsConfig || {}
  }
  /* Start and Validate Config File */
  startDump() {
    Joi.validate(this.config, ValidatorSchema['config'])
      .then(response => {
        const wp_prod_keys = _.keys(response['wordpress']['production'])
        const wp_dev_keys = _.keys(response['wordpress']['develop'])

        const mysql_prod_keys = _.keys(response['mysql']['production'])
        const mysql_dev_keys = _.keys(response['mysql']['develop'])

        const wordpress_Schema = toObjectWpSchema(wp_prod_keys, wp_dev_keys)
        const mysql_Schema = toObjectSqlSchema(mysql_prod_keys, mysql_dev_keys)

        Joi.validate(response['wordpress'], wordpress_Schema)
          .then(() => {
            Joi.validate(response['mysql'], mysql_Schema)
              .then(() => {
                if (verifyParams()) {
                  log.info('\n')
                  log.info(this.config['log']['messages'][`${BACKUP}-start`])
                  /* Backups Folders Verification */
                  verifyBackupsFolders()
                  /* mysqp or wp-content backups */
                  if (BACKUP === 'mysql') mysqlBackup()
                  else if (BACKUP === 'wordpress') wordpressCompress()
                }
              }).catch(err => {
                const error = err.details ? err.details[0] : err
                log.error(error)
              })
          }).catch(err => { log.error(err.details[0]) })
      }).catch(err => { log.error(err.details[0]) })
  }
}

/* MySql Dump All Databases */
function mysqlBackup() {
  const ROOT = config['backups']['SRC'][ENV]
  const TYPE_BACKUP = config['backups']['TYPE']
  /* TimeZone Setting */
  const TIME = new TimeZoneClass()

  const ENV_DATABASES = _.keys(config['mysql'][ENV])

  for (let DB of ENV_DATABASES) {
    const STORAGE = config['mysql'][ENV][DB]
    const DB_NAME = STORAGE['DB_NAME']
    const KEY = `BACKUP ${DB_NAME} ${TIME['FORMAT_DATE']} [${TIME['FORMAT_TZ']}].sql`
    const SQL_PATH = `${ROOT}/backups/mysql/${DB}/${TYPE_BACKUP}/${KEY}`
    const SQL_LOG = `backups/mysql/${DB}/${TYPE_BACKUP}/${KEY}`

    const DUMP = new ConnectionClass(STORAGE, SQL_PATH)

    fileSystem.writeFile(SQL_PATH, (err) => {
      if (err) {
        log.error(`IT HAS NOT BEEN ABLE TO CREATE ${SQL_LOG}`)
        log.error(err)
      }else {
        DUMP.mysqlDump()
        backupsFileLimitation(SQL_PATH, 'sql', (err) => {
          if (err) {
            log.info(`${SQL_LOG} HAS BEEN ADDED WITH ERROR`)
            log.error(err)
          } else {
            log.info(`${SQL_LOG} HAS BEEN ADDED`)
          }
        })
      }
    })
  }
}

/* wp-content tar.gz compress */
function wordpressCompress() {
  const ROOT = config['backups']['SRC'][ENV]
  const TYPE_BACKUP = config['backups']['TYPE']
  /* TimeZone Setting */
  const TIME = new TimeZoneClass()
  /* Get All wordpress sites */
  const SITES = _.keys(config['wordpress'][ENV])

  /* Serial Promises Array */
  const queue = SITES.map((SITE) =>
    () => new Promise(resolve => {
      const PATH = config['wordpress'][ENV][SITE]
      const KEY = `BACKUP ${SITE}-wp-content ${TIME['FORMAT_DATE']} [${TIME['FORMAT_TZ']}].tar.gz`
      const ZIP_PATH = `${ROOT}/backups/wordpress/${SITE}/${TYPE_BACKUP}/${KEY}`
      const TarGz = `backups/wordpress/${SITE}/${TYPE_BACKUP}/${KEY}`

      targz.compress({
        src: PATH,
        dest: ZIP_PATH
      }, function(err){
        if(err) {
          log.error(err)
          resolve()
        } else {
          backupsFileLimitation(ZIP_PATH, 'gz', (err) => {
            if (err) {
              log.info(`${TarGz} HAS BEEN ADDED WITH ERROR`)
              log.error(err)
              resolve()
            } else {
              log.info(`${TarGz} HAS BEEN ADDED`)
              resolve()
            }
          })
        }
      })
    }))
  /* Run Serial Promises */
  PromiSerial(queue)
}

/* Verify all folders for file storage in the destination folder */
function verifyBackupsFolders() {
  const ROOT = config['backups']['SRC'][ENV]
  const FOLDER_KEYS = _.keys(config[BACKUP][ENV])

  fileSystem.existsSync(`${ROOT}/backups`)
  fileSystem.existsSync(`${ROOT}/backups/${BACKUP}`)

  for (let FOLDER of FOLDER_KEYS) {
    fileSystem.existsSync(`${ROOT}/backups/${BACKUP}/${FOLDER}`)
    fileSystem.existsSync(`${ROOT}/backups/${BACKUP}/${FOLDER}/daily`)
    fileSystem.existsSync(`${ROOT}/backups/${BACKUP}/${FOLDER}/monthly`)
  }
}

/* Limit number of files depending on the storage mode */
function backupsFileLimitation(filePath, filesExt, cb) {
  const DIR = filePath.slice(0, filePath.lastIndexOf('/'))
  fileSystem.readdir(`${DIR}`, filesExt, (err, response) => {
    if (err) { cb(err) } else {
      if (response['fileTypeCount'] <= config['backups']['MAX_FILES']) { cb() }
      else {
        fileSystem.unlink(`${DIR}/${response['files'][0]}`, cb)
      }
    }
  })
}

/* Validate Server Params */
function verifyParams() {
  if ((ENV !== 'develop' && ENV !== 'production') ||
      (BACKUP !== 'wordpress' && BACKUP !== 'mysql')) {
    const CAT = `BACKUP_ENV=${BACKUP} and NODE_ENV=${ENV}`
    throw new Error(`Please check that your parameters are valid. ${CAT}`)
  }
  return true
}

/* Validate Wodpress Object */
function toObjectWpSchema(production, develop) {
  var wp_Shema = { production: {}, develop: {} }
  for (let p = 0; p < production.length; ++p)
    wp_Shema['production'][production[p]] = ValidatorSchema['wordpress']
  for (let d = 0; d < develop.length; ++d)
    wp_Shema['develop'][develop[d]] = ValidatorSchema['wordpress']
  return wp_Shema
}

/* Validate MySQL Object */
function toObjectSqlSchema(production, develop) {
  var mysql_Shema = { production: {}, develop: {} }
  for (let p = 0; p < production.length; ++p)
    mysql_Shema['production'][production[p]] = ValidatorSchema['mysql']
  for (let d = 0; d < develop.length; ++d)
    mysql_Shema['develop'][develop[d]] = ValidatorSchema['mysql']
  return mysql_Shema
}
