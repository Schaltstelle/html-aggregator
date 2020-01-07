'use strict'

const debug = require('debug')('processors')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const chokidar = require('chokidar')
const server = require('live-server')

const template = require('./template')
const markdown = require('./markdown')
const configs = require('./configs')
const files = require('./files')

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

registerProc('Copy', '', input => Promise.resolve({data: input}), {format: 'binary', priority: -200})

function runAll(stats) {
    let ignore = ['node_modules/**', configs.args.outputDir + '/**'].concat(configs.args.exclude)
    let statCache = {}
    return files.glob('**', {
        nodir: true,
        ignore: ignore,
        statCache
    }).then(files => runProcs(files, statCache))

    function runProcs(files, newStats) {
        let changed = files.filter(file => {
            let absolute = process.cwd() + '/' + file
            let modified = !stats || !stats[absolute] || newStats[absolute].mtimeMs > stats[absolute].mtimeMs
            return modified && !findProc(file).lastPass
        })
        if (changed.length === 0) {
            let lastPasses = files
                .filter(file => findProc(file).lastPass)
                .map(file => runProc(file))
            return Promise.all(lastPasses).then(() => {
                debug('Found no more changed resources')
                if (configs.args.watch) {
                    serve(configs.args.port, configs.args.reload)
                    watch(ignore)
                }
            })
        }
        debug('Found %d changed resources', changed.length)
        let procs = changed.map(file => runProc(file))
        return Promise.all(procs).then(() => runAll(newStats))
    }
}

function registerProc(name, test, exec, options) {
    procs.push({name, test, exec, priority: 0, ...options})
    procs.sort((a, b) => a.priority < b.priority ? 1 : a.priority > b.priority ? -1 : 0)
}

function runProc(file) {
    //TODO fails on delete event
    let proc = findProc(file)
    let ignore = !proc.underscoreFiles && (file.substring(0, 1) === '_' || file.indexOf('/_') >= 0)
    return ignore ? Promise.resolve('ignored') : execProc(proc, file)
}

function findProc(file) {
    return procs.find(p => file.match(p.test))
}

function execProc(proc, file) {
    files.readFileWithFormat(file, proc.format || 'text')
        .then(data => proc.exec(data))
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

function serve(port, reload) {
    server.start({
        port,
        root: configs.args.outputDir,
        logLevel: 0,
        wait: reload,
        ignorePattern: reload < 0 ? '**/*' : undefined,
        open: false
    })
    debug('Serving at', chalk.blue.underline('http://localhost:' + port))
}

function watch(ignore) {
    let ignored = ignore.concat(['**/.*', '**/.*/**', configs.args.outputDir])
    chokidar.watch('', {
        ignoreInitial: true,
        ignored: ignored
    })
        .on('ready', () => debug('Watching for changes...'))
        .on('all', (event, file) => runProc(file))
        .on('error', err => debug(err))
}
