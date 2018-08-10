'use strict'

const path = require('path')
const fs = require('fs')

module.exports = {
  getRootDir: () => {
    return path.parse(process.cwd()).root
  },
  appRoot: (dir) => {
    return path.resolve(dir)
  },
  existsSync: (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  },
  writeFile: (dir, cb) => {
    fs.writeFile(dir, '', { overwrite: false }, cb)
  },
  readdir: (dir, ext, cb) => {
    fs.readdir(dir, (err, files) => {
      if (err) { cb(err) } else {
        const response = {}
        let extCount = 0
        let filesExt = []
        for(let i in files) {
          if(path.extname(files[i]) === `.${ext}`) {
            extCount = extCount + 1
            filesExt.push(files[i])
          }
        }
        response['files'] = filesExt
        response['allFilesCount'] = files.length
        response['fileType'] = ext
        response['fileTypeCount'] = extCount
        cb(null, response)
      }
    })
  },
  replace: (file, replacement, cb) => {
    fs.readFile(replacement, (err, contents) => {
      if (err) return cb(err)
      else fs.writeFile(file, contents, cb)
    })
  },
  unlink: (file, cb) => {
    fs.unlink(file, cb)
  }
}
