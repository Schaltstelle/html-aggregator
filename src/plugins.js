'use strict'

const debug = require('debug')('plugins')
const chalk = require('chalk')
const moment = require('moment')
const glob = require('glob')
const path = require('path')
const fs = require('fs')

const template = require('./template')
const markdown = require('./markdown')
const procs = require('./processors')
const files = require('./files')

module.exports = files.glob('_plugins/**/*.js').then(files =>
    Promise.all(files.map(file => {
        debug('Loading', chalk.blue(file))
        let relFile = path.relative(__dirname, file)
        return require(relFile.substring(0, relFile.length - 3))
    }))
)

template.registerHelper('formatDate', (date, format) => moment(date).format(format))

template.registerHelper('noNewlines', data => data ? data.replace(/[\n\r]/g, ' ') : '')

template.registerHelper('noLinks', data => data ? data.replace(/<a( .*?)?>(.*?)<\/a>/g, '$2') : '')

template.registerHelper('noTags', data => data ? data.replace(/<(.*?)( .*?)?>(.*?)<\/\1>/g, '$3').replace(/<(.*?)\/>/g, '') : '')

template.registerHelper('include', function (name, config) {
    return procs.processorsFor(name)[0]
    .exec(fs.readFileSync(name, 'utf8'), Object.assign({}, this, config.hash))
    .then(res => res.data)
})

template.registerHelper('globYaml', data => {
    let patterns = Array.isArray(data) ? data : data.split(' ')
    return Promise.all(patterns.map(pattern => files.glob(pattern)))
        .then(filesList =>
            Promise.all(arrayFlat(filesList).map(file =>
                ({file, data: markdown.load(fs.readFileSync(file, 'utf-8'))}))))
        .then(entryList =>
            entryList.reduce((map, obj) => {
                map[obj.file] = obj.data
                return map
            }, {}))
})

function arrayFlat(arr) {
    return arr.reduce((acc, val) => acc.concat(val), [])
}
