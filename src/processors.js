'use strict'

const debug = require('debug')('processors')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const chokidar = require('chokidar')
const matcher = require('picomatch')
const server = require('live-server')

const template = require('./template')
const markdown = require('./markdown')
const configs = require('./configs')
const files = require('./files')

let procs = []
let mappings = {}

module.exports = {
    registerProcessor: registerProc,
    run: file => file ? runProcs(file) : runAll(),
    processorsFor: findProcs
}

registerProc('Markdown', '**/*.(md|yml|yaml)', markdown.run, {priority: -100})

registerProc('Template', '**/*.html', template.run, {priority: -100})

registerProc('Copy', '**/*', input => Promise.resolve({data: input}), {single: true, format: 'binary', priority: -200})

function runAll(stats) {
    let ignore = ['node_modules/**', configs.args.outputDir + '/**'].concat(configs.args.exclude)
    let statCache = {}
    return files.glob('**', {
        nodir: true,
        ignore: ignore,
        statCache
    }).then(files => run(files, statCache))

    function run(files, newStats) {
        let changed = files.filter(file => {
            let absolute = process.cwd() + '/' + file
            let modified = !stats || !stats[absolute] || newStats[absolute].mtimeMs > stats[absolute].mtimeMs
            return modified && findProcs(file, false).length > 0
        })
        if (changed.length > 0) {
            debug('%d changed resources found.', changed.length)
            let procs = changed.map(file => runProcs(file, false))
            return Promise.all(procs).then(() => runAll(newStats))
        }
        let lastPasses = files.map(file => runProcs(file, true))
        return Promise.all(lastPasses).then(() => {
            debug('No more changed resources found.')
            if (configs.args.watch) {
                serve(configs.args.port, configs.args.reload)
                watch(ignore)
            }
        })
    }
}

/**
 *
 * @param name
 * @param test
 * @param exec
 * @param options
 *  format: in which format the file is read ('binary', 'text', 'file')
 *  underscoreFiles: if true, accept also files/directories starting with _
 *  priority: the higher, the earlier a processor is run <br>
 *  lastPass: if true, this processor runs last
 *  single: this processor runs only if no other processor run before on the file
 */
function registerProc(name, test, exec, options) {
    procs.push({
        name,
        test: matcher(test),
        exec,
        priority: 0,
        ...options,
        underscoreFiles: (options && options.underscoreFiles) || hasUnderscore(test)
    })
    procs.sort((a, b) => a.priority < b.priority ? 1 : a.priority > b.priority ? -1 : 0)
}

function findProcs(file, lastPass) {
    return procs.filter(proc => (lastPass === undefined ? true : lastPass === !!proc.lastPass) && proc.test(file))
}

function runProcs(file, lastPass) {
    let found = false
    return Promise.all(findProcs(file, lastPass).map(proc => {
        if ((!proc.underscoreFiles && hasUnderscore(file)) || (proc.single && found)) {
            return Promise.resolve('ignored')
        }
        found = true
        return execProc(proc, file)
    }))
}

function hasUnderscore(file) {
    return file.substring(0, 1) === '_' || file.indexOf('/_') >= 0
}

function execProc(proc, file) {
    return files.readFileWithFormat(file, proc.format || 'text')
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
            if (res.data) {
                fs.writeFileSync(outName, res.data)
            }
            addMapping(file, outName)
            debug(proc.name, chalk.blue(file), '->', chalk.green(path.relative('', outName)))
        })
        .catch(err => {
            debug(proc.name, chalk.blue(file), chalk.red(err))
            return Promise.reject(err)
        })
}

function addMapping(file, name) {
    (mappings[file] = mappings[file] || []).push(name)
}

function remove(file) {
    let names = mappings[file]
    if (names) {
        for (let i = 0; i < names.length; i++) {
            fs.unlink(names[i], () => {
            })
        }
        delete mappings[file]
    }
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
    debug('Serving at', chalk.blue.underline(`http://localhost: ${port}`))
}

function watch(ignore) {
    let ignored = ignore.concat(['**/.*', '**/.*/**', configs.args.outputDir])
    chokidar.watch('', {
        ignoreInitial: true,
        ignored: ignored
    })
        .on('ready', () => debug('Watching for changes...'))
        .on('add', file => runProcs(file))
        .on('change', file => runProcs(file))
        .on('unlink', file => remove(file))
        .on('error', err => debug(err))
}
