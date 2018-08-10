'use strict'

const Joi = require('joi')

/* Config file root struct */
const struct = Joi.object().keys({
  mysql: Joi.object().keys({
    production: Joi.object(),
    develop: Joi.object()
  }),
  wordpress: Joi.object().keys({
    production: Joi.object(),
    develop: Joi.object()
  }),
  backups: Joi.object().keys({
    MAX_FILES: Joi.number().integer().required(),
    TYPE: Joi.string().required(),
    SRC: Joi.object().keys({
      production: Joi.string().required(),
      develop: Joi.string()
    })
  }),
  log: Joi.object().keys({
    messages: Joi.object().keys({
      'exit': Joi.string().required(),
      'wordpress-start': Joi.string().required(),
      'mysql-start': Joi.string().required()
    })
  })
})

module.exports = {
  /* Config file: required keys */
  config: struct.requiredKeys('mysql', 'wordpress',
    'backups', 'log', 'mysql.production', 'mysql.develop', 'wordpress.develop',
    'wordpress.production', 'backups.SRC', 'log.messages'),
  /* Mysql Config Struct */
  mysql: Joi.object().keys({
    DB_HOST: Joi.string().required(),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_PORT: Joi.number().integer().required(),
    DB_NAME: Joi.string().required()
  }),
  /* Wodpress Config Struct */
  wordpress: Joi.string().required()
}
