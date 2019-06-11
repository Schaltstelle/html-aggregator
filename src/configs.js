'use strict'

const fs = require('fs')
const yaml = require('./yaml')

let args = {args: [], env: process.env}
readFile('_config.yaml')
readArgv()
normalize()

module.exports = {
    add: function (config) {
        Object.assign(args, config)
        normalize()
        return args
    },
    args: args
}

function readFile(file) {
    if (fs.existsSync(file)) {
        Object.assign(args, yaml.loadSync(fs.readFileSync(file, 'utf8')))
    }
}

function readArgv() {
    let start = endsWith(process.argv[1], '_mocha') ? 2 : 3
    for (let i = start; i < process.argv.length; i++) {
        let arg = process.argv[i]
        if (arg.substring(0, 2) === '--') {
            let parts = arg.split('=')
            args[parts[0].substring(2)] = (parts.length === 2) ? parts[1] : true
        } else {
            args.args.push(arg)
        }
    }
}

function normalize() {
    args.outputDir = args.outputDir || 'output'
    args.exclude = Array.isArray(args.exclude) ? args.exclude : (args.exclude || '').split(',')
    args.port = args.port || 8111
}

function endsWith(s, end) {
    return s.substring(s.length - end.length) === end
}
