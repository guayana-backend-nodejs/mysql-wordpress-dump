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
    try {
      const response = {}
      let extCount = 0
      let filesExt = []

      let files = fs.readdirSync(dir)
      files.sort(function(fileA, fileB) {
        return fs.statSync(`${dir}/${fileA}`).mtime.getTime() - fs.statSync(`${dir}/${fileB}`).mtime.getTime()
      })

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
    } catch (e) {
      cb(e)
    }
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
