'use strict'

const fs = require('fs')
const globber = require('glob')

module.exports = {
    readFileWithFormat, readFile, glob
}

function readFileWithFormat(file, format) {
    switch (format) {
    case 'text':
        return readFile(file, 'utf8')
    case 'binary':
        return readFile(file)
    case 'file':
        return Promise.resolve(file)
    default:
        return Promise.reject(`Unknown format: ${format}. Use 'text', 'binary', 'file'.`)
    }
}

function readFile(file, options) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, options, (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

function glob(pattern, options) {
    return new Promise((resolve, reject) => {
        globber(pattern, options, (err, files) => {
            if (err) {
                reject(err)
            } else {
                resolve(files)
            }
        })
    })
}
