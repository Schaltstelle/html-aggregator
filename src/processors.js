'use strict';

const debug = require('debug')('processors');
const chalk = require('chalk');
const template = require('./template');
const markdown = require('./markdown');
const configs = require('./configs');
const glob = require('glob');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const chokidar = require('chokidar');
const server = require('http-server');

let procs = [];

module.exports = {
    registerProcessor: registerProc,
    run: function (file) {
        return file ? runProc(file) : runAll();
    },
    processorFor: findProc
};

registerProc('Markdown', '\.(md|yml|yaml)$', true, markdown.run);

registerProc('Template', '\.html$', true, template.run);

registerProc('Copy', '', false, (input) => {
    return Promise.resolve({data: input});
});

function runAll() {
    return new Promise((resolve, reject) => {
        let ignore = ['node_modules/**', configs.args.outputDir + '/**', '**/_*/**', '**/_*'].concat(configs.args.exclude);
        glob('**', {
            nodir: true,
            ignore: ignore
        }, (err, files) => {
            if (err) {
                reject(err);
            }
            resolve(Promise.all(
                files.map(file => runProc(file))).then(() => {
                    debug('Processed %d resources', files.length);
                    if (configs.args.watch) {
                        serve(8111);
                        watch(ignore);
                    }
                })
            );
        });
    });
}

function registerProc(name, test, textInput, exec) {
    procs.push({name: name, test: test, textInput: textInput, exec: exec});
}

function runProc(file) {
    //TODO fails on delete event
    return execProc(findProc(file), file);
}

function findProc(file) {
    return procs.find(p => file.match(p.test));
}

function execProc(proc, file) {
    let data = fs.readFileSync(file, proc.textInput ? 'utf8' : {})
    return proc.exec(data)
        .then(res => {
            let outParts = path.parse(path.resolve(configs.args.outputDir, file))
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
        debug('Serving at', chalk.blue.underline('http://localhost:' + port));
    });
}

function watch(ignore) {
    let ignored = ignore.concat(['**/.*', '**/.*/**', configs.args.outputDir]);
    chokidar.watch('', {
        ignoreInitial: true,
        ignored: ignored
    }).on('ready', () => {
        debug('Watching for changes...');
    }).on('all', (event, file) => {
        runProc(file);
    }).on('error', (err) => debug(err));
}