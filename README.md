## Installation

Using npm:

```
$ npm i --save mysql-wordpress-dump
```

## Use in Node.js

### Config File

```js
'use strict'

const StorageClass = require('mysql-wordpress-dump').storage

module.exports = {
  mysql: {
    production: {
      storageOne: new StorageClass('host', 'user', 'password', 'port', 'database')
    },
    develop: {
      storageDevOne: new StorageClass('host', 'user', 'password', 'port', 'database')
    }
  },
  wordpress: {
    production: {
      locationOne: '/var/www/html/site/wp-content'
    },
    develop: {
      locationDevOne: '/var/www/html/site/wp-content'
    }
  },
  backups: {
    MAX_FILES: 10,
    TYPE: 'database',
    SRC: {
      production: '/home/temp',
      develop: '/home/dev/temp'
    }
  },
  log: {
    messages: {
      'exit': 'message',
      'wordpress-start': 'message',
      'mysql-start': 'message'
    }
  }
}

```

### Index application

```js
const DumpClass = require('mysql-wordpress-dump').dump
const dump = new DumpClass(config)

dump.startDump()

process.on('exit', () => {
  console.log(config['log']['messages']['exit'])
})
```

## How Do I install or create or edit my own cron jobs?

To edit or create your own crontab file, type the following command at the UNIX / Linux shell prompt:

```
$ export EDITOR=nano (optional)
$ crontab -e
```

## Do I have to restart cron after changing the crontable file?

No. Cron will examine the modification time on all crontabs and reload those which have changed. Thus cron need not be restarted whenever a crontab file is modified.

## Syntax of crontab (field description)

The syntax is:

```
1 2 3 4 5 /path/to/command arg1 arg2
```

Where,

* 1: Minute (0-59)
* 2: Hours (0-23)
* 3: Day (0-31)
* 4: Month (0-12 [12 == December])
* 5: Day of the week(0-7 [7 or 0 == sunday])
* /path/to/command – Script or command name to schedule

Easy to remember format:

```
* * * * * command to be executed
- - - - -
| | | | |
| | | | ----- Day of week (0 - 7) (Sunday=0 or 7)
| | | ------- Month (1 - 12)
| | --------- Day of month (1 - 31)
| ----------- Hour (0 - 23)
------------- Minute (0 - 59)
```

## Create CronTab Script

### Set the task execution time

Go to [Crontab Guru](https://crontab.guru/#*_*_*_*_*).

### Get Node install localtion

Write the following command in the terminal:

```
$ which node
```

### Get application location in the system

Enter the following command in the application folder:

```
$ pwd
```

### Add Backup Type

Add `mysql` OR `wordpress` after the app location. For Example:

```
1 2 3 4 5 /path/to/node /path/to/app/file.js mysql
```

### Add Development environment (Only for development tests)

If you want to perform tests outside of the production environment you need to add `develop` after the file location.
Omit this value if the script runs on the production server. For Example:

```
1 2 3 4 5 /path/to/node /path/to/app/file.js mysql develop
```

### Add output file for application logs (Optional)

If you want to keep a file for the executions of the application you must add the following to the end of crontab script

```
1 2 3 4 5 /path/to/node /path/to/app/filefile.js mysql develop >> /path/to/logs/log-file.log 2>&1
```

### Full Example

```
* * * * * ${which node} ${pwd-application}/${filename}.js ${backup-type} ${env} >> ${pwd-logs-location}/${log-filename}.log 2>&1
```

### More info

* [How To Add Jobs To cron Under Linux or UNIX](https://www.cyberciti.biz/faq/how-do-i-add-jobs-to-cron-under-linux-or-unix-oses/)
* [Setting Up a Basic Cron Job in Linux](https://www.taniarascia.com/setting-up-a-basic-cron-job-in-linux/)
