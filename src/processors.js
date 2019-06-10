'use strict'

const debug = require('debug')('processors')
const chalk = require('chalk')
const template = require('./template')
const markdown = require('./markdown')
const configs = require('./configs')
const glob = require('glob')
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const chokidar = require('chokidar')
const server = require('http-server')

let procs = []

module.exports = {
    registerProcessor: registerProc,
    run: function (file) {
        return file ? runProc(file) : runAll()
    },
    processorFor: findProc
}

registerProc('Markdown', '\.(md|yml|yaml)$', markdown.run, {priority: -100})

registerProc('Template', '\.html$', template.run, {priority: -100})

registerProc('Copy', '', input => Promise.resolve({data: input}), {binaryInput: true, priority: -200})

function runAll() {
    return new Promise((resolve, reject) => {
        let ignore = ['node_modules/**', configs.args.outputDir + '/**'].concat(configs.args.exclude)
        glob('**', {
            nodir: true,
            ignore: ignore
        }, (err, files) => {
            if (err) {
                reject(err)
            }
            resolve(Promise.all(
                files.map(file => runProc(file))).then(() => {
                    debug('Processed %d resources', files.length)
                    if (configs.args.watch) {
                        serve(8111)
                        watch(ignore)
                    }
                })
            )
        })
    })
}

function registerProc(name, test, exec, options) {
    procs.push({name, test, exec, priority: 0, ...options})
    procs.sort((a, b) => a.priority < b.priority ? 1 : a.priority > b.priority ? -1 : 0)
}

function runProc(file) {
    //TODO fails on delete event
    let proc = findProc(file)
    return !proc.underscoreFiles && (file.substring(0,1)==='_' || file.indexOf('/_')>=0) ? Promise.resolve('ignored') : execProc(proc, file)
}

function findProc(file) {
    return procs.find(p => file.match(p.test))
}

function execProc(proc, file) {
    let data = fs.readFileSync(file, proc.binaryInput ? {} : 'utf8')
    return proc.exec(data)
        .then(res => {
            let outPath = file
            if (res.path) {
                outPath = res.path.substring(res.path.length - 1) === '/'
                    ? res.path + path.parse(file).base
                    : res.path
            }
            let outParts = path.parse(path.resolve(configs.args.outputDir, outPath))
            fse.mkdirsSync(outParts.dir)
            let outName = path.resolve(outParts.dir, outParts.name + (res.ext ? res.ext : outParts.ext))
            fs.writeFileSync(outName, res.data)
            debug(proc.name, chalk.blue(file), '->', chalk.green(path.relative('', outName)))
        })
        .catch(err => {
            debug(proc.name, chalk.blue(file), chalk.red(err))
            return Promise.reject(err)
        })
}

function serve(port) {
    server.createServer({root: configs.args.outputDir, cache: -1}).listen(port, '127.0.0.1', () => {
        debug('Serving at', chalk.blue.underline('http://localhost:' + port))
    })
}

function watch(ignore) {
    let ignored = ignore.concat(['**/.*', '**/.*/**', configs.args.outputDir])
    chokidar.watch('', {
        ignoreInitial: true,
        ignored: ignored
    }).on('ready', () => {
        debug('Watching for changes...')
    }).on('all', (event, file) => {
        runProc(file)
    }).on('error', (err) => debug(err))
}