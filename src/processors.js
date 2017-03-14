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
                    files.map(file => execProc(findProc(file), file))).then(() => {
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

registerProc('Markdown', '\.md$', true, (data) => {
    return markdown.run(data, configs.args);
});

registerProc('Template', '\.html$', true, (data) => {
    return template.run(data, configs.args);
});

registerProc('Copy', '', false, (data) => {
    return Promise.resolve(data);
});

function registerProc(name, test, text, proc) {
    procs.push({name: name, test: test, text: text, proc: proc});
}

function findProc(file) {
    return procs.find(p => file.match(p.test));
}

function execProc(proc, file) {
    let data = fs.readFileSync(file, proc.text ? 'utf8' : {});
    return proc.proc(data).then(res => {
        let outParts = path.parse(path.resolve(configs.args.outputDir, file));
        fse.mkdirsSync(outParts.dir);
        let outName = path.resolve(outParts.dir, outParts.name + (res.ext ? res.ext : outParts.ext));
        fs.writeFileSync(outName, res.data);
        debug(proc.name, chalk.blue(file), '->', chalk.green(path.relative('', outName)));
    }).catch(err => debug(proc.name, chalk.blue(file), chalk.red(err)));
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
        execProc(findProc(file), file);
    }).on('error', (err) => debug(err));
}