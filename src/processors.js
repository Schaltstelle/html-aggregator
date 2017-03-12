'use strict';

const debug = require('debug')('processors');
const chalk = require('chalk');
const template = require('./template');
const markdown = require('./markdown');
const configs = require('./configs');
const glob = require('glob');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');
const server = require('http-server');

let procs = {};

module.exports = {
    registerProcessor: registerProc,
    run: function () {
        return new Promise((resolve, reject) => {
            let ignore = ['node_modules/**', configs.args.outputDir + '/**', '_*/**', '_*'].concat(configs.args.exclude);
            glob('**', {
                nodir: true,
                ignore: ignore
            }, (err, files) => {
                if (err) {
                    reject(err);
                }
                resolve(Promise.all(
                    files.map(file => findProc(file)(file, true))).then(() => {
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
};

registerProc('\.md$', (file) => {
    return markdown.run('', file, configs.args.outputDir);
});

registerProc('\.html$', (file) => {
    return template.file('', file, configs.args, configs.args.outputDir);
});

function registerProc(name, proc) {
    procs[name] = proc;
}

function findProc(file) {
    for (let pat in procs) {
        if (file.match(pat)) {
            return procs[pat];
        }
    }
    return (file, init) => new Promise((resolve, reject) => {
        if (!init) {
            debug('Copy', chalk.green(file));
        }
        fse.copy(file, path.resolve(configs.args.outputDir, file), (err) => {
            if (err) reject(err); else resolve();
        });
    });
}

function serve(port) {
    server.createServer({root: configs.args.outputDir, cache: -1}).listen(port, '127.0.0.1', () => {
        debug('Serving at', chalk.blue.underline('http://localhost:' + port));
    });
}

function watch(ignore) {
    let ignored = ignore.concat(['.*', '.*/**', configs.args.outputDir]);
    chokidar.watch('', {
        ignoreInitial: true,
        ignored: ignored
    }).on('ready', () => {
        debug('Watching for changes...');
    }).on('all', (event, file) => {
        findProc(file)(file, false);
    }).on('error', (err) => debug(err));
}