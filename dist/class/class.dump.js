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
/* File Watcher [decrapper] */
const chokidar = require('chokidar')
/* Serial promises Module */
const PromiSerial = require('promise-serial')
/* Validator Join Module */
const Joi = require('joi')

module.exports = class {
  constructor(config) {
    this.config = config || {}
  }
  /* MySql Dump All Databases */
  mysqlBackup() {
    const ROOT = this.config['backups']['SRC'][ENV]
    const TYPE_BACKUP = this.config['backups']['TYPE']
    /* TimeZone Setting */
    const TIME = new TimeZoneClass()

    const ENV_DATABASES = _.keys(this.config['mysql'][ENV])

    for (let DB of ENV_DATABASES) {
      const STORAGE = this.config['mysql'][ENV][DB]
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
          this.backupsFileLimitation(SQL_PATH, 'sql', (err) => {
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
  wordpressCompress() {
    const vm = this
    const ROOT = vm.config['backups']['SRC'][ENV]
    const TYPE_BACKUP = vm.config['backups']['TYPE']
    /* TimeZone Setting */
    const TIME = new TimeZoneClass()
    /* Get All wordpress sites */
    const SITES = _.keys(vm.config['wordpress'][ENV])

    /* Serial Promises Array */
    const queue = SITES.map((SITE) =>
      () => new Promise(resolve => {
        const PATH = vm.config['wordpress'][ENV][SITE]
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
            vm.backupsFileLimitation(ZIP_PATH, 'gz', (err) => {
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
  verifyBackupsFolders() {
    const ROOT = this.config['backups']['SRC'][ENV]
    const FOLDER_KEYS = _.keys(this.config[BACKUP][ENV])

    fileSystem.existsSync(`${ROOT}/backups`)
    fileSystem.existsSync(`${ROOT}/backups/${BACKUP}`)

    for (let FOLDER of FOLDER_KEYS) {
      fileSystem.existsSync(`${ROOT}/backups/${BACKUP}/${FOLDER}`)
      fileSystem.existsSync(`${ROOT}/backups/${BACKUP}/${FOLDER}/daily`)
      fileSystem.existsSync(`${ROOT}/backups/${BACKUP}/${FOLDER}/monthly`)
    }
  }

  /* Limit number of files depending on the storage mode */
  backupsFileLimitation(filePath, filesExt, cb) {
    const DIR = filePath.slice(0, filePath.lastIndexOf('/'))
    fileSystem.readdir(`${DIR}`, filesExt, (err, response) => {
      if (err) { cb(err) } else {
        if (response['fileTypeCount'] <= this.config['backups']['MAX_FILES']) { cb() }
        else {
          fileSystem.unlink(`${DIR}/${response['files'][0]}`, cb)
        }
      }
    })
  }

  /* Validate Server Params */
  verifyParams() {
    if ((ENV !== 'develop' && ENV !== 'production') ||
        (BACKUP !== 'wordpress' && BACKUP !== 'mysql')) {
      const CAT = `BACKUP=${BACKUP} and ENV=${ENV}`
      throw new Error(`Please check that your parameters are valid. ${CAT}`)
    }
    return true
  }

  /* Start and Validate Config File */
  startDump() {
    Joi.validate(this.config, ValidatorSchema['config'])
      .then(response => {
        const wp_prod_keys = _.keys(response['wordpress']['production'])
        const wp_dev_keys = _.keys(response['wordpress']['develop'])

        const mysql_prod_keys = _.keys(response['mysql']['production'])
        const mysql_dev_keys = _.keys(response['mysql']['develop'])

        const wordpress_Schema = this.toObjectWpSchema(wp_prod_keys, wp_dev_keys)
        const mysql_Schema = this.toObjectSqlSchema(mysql_prod_keys, mysql_dev_keys)

        Joi.validate(response['wordpress'], wordpress_Schema)
          .then(() => {
            Joi.validate(response['mysql'], mysql_Schema)
              .then(() => {
                if (this.verifyParams()) {
                  log.info('\n')
                  log.info(this.config['log']['messages'][`${BACKUP}-start`])
                  /* Backups Folders Verification */
                  this.verifyBackupsFolders()
                  /* mysqp or wp-content backups */
                  if (BACKUP === 'mysql') this.mysqlBackup()
                  else if (BACKUP === 'wordpress') this.wordpressCompress()
                }
              }).catch(err => {
                const error = err.details ? err.details[0] : err
                log.error(error)
              })
          }).catch(err => { log.error(err.details[0]) })
      }).catch(err => { log.error(err.details[0]) })
  }

  /* Validate Wodpress Object */
  toObjectWpSchema(production, develop) {
    var wp_Shema = { production: {}, develop: {} }
    for (let p = 0; p < production.length; ++p)
      wp_Shema['production'][production[p]] = ValidatorSchema['wordpress']
    for (let d = 0; d < develop.length; ++d)
      wp_Shema['develop'][develop[d]] = ValidatorSchema['wordpress']
    return wp_Shema
  }

  /* Validate MySQL Object */
  toObjectSqlSchema(production, develop) {
    var mysql_Shema = { production: {}, develop: {} }
    for (let p = 0; p < production.length; ++p)
      mysql_Shema['production'][production[p]] = ValidatorSchema['mysql']
    for (let d = 0; d < develop.length; ++d)
      mysql_Shema['develop'][develop[d]] = ValidatorSchema['mysql']
    return mysql_Shema
  }

  /* File Watcher Process [decrapper] */
  watcherSqlFile(FOLDER, KEY) {
    const watcher = chokidar.watch(FOLDER, {
      persistent: true,
      ignored: [`${FOLDER}/*.md`, `${FOLDER}/.DS_Store`],
    })
    watcher
      .on('add', (PATH) => {
        const KEY_PATH = PATH.slice(PATH.lastIndexOf('/') + 1, PATH.length)
        if (KEY_PATH === KEY) {
          this.backupsFileLimitation(`${FOLDER}/${KEY}`, 'sql', (err) => {
            if (err) {
              log.info(`${PATH} HAS BEEN ADDED WITH ERROR`)
              log.error(err)
            } else {
              log.info(`${PATH} HAS BEEN ADDED`)
            }
          })
          watcher.close()
        }
      })
      .on('error', (err) => {
        log.error(`ERROR HAPPENED: ${err}`)
        watcher.close()
      })
  }
}
