'use strict';

const debug = require('debug')('processors');
const template = require('./template');
const markdown = require('./markdown');
const aggregate = require('./aggregate');
const configs = require('./configs');
const glob = require('glob');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');

let procs = {};

module.exports = {
    registerProcessor: registerProc,
    run: function () {
        let ignore = ['node_modules/**', configs.args.outputDir + '/**', '_*/**', '_*'].concat(configs.args.exclude);
        let build = new Promise((resolve, reject) => {
            glob('**', {
                nodir: true,
                ignore: ignore
            }, (err, files) => {
                if (err) {
                    reject(err);
                }
                resolve(
                    Promise.all(files.map(file => findProc(file)(file)))
                        .then(() => debug('Processed %d resources', files.length))
                );
            });
        });
        if (configs.args.watch) {
            let ignored = ignore.concat(['.*', '.*/**', configs.args.outputDir]);
            chokidar.watch('', {
                ignoreInitial: true,
                ignored: ignored
            }).on('all', (event, file) => {
                findProc(file)(file);
            }).on('error', (err) => debug(err));
        }
        return build;
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
    return (file) => new Promise((resolve, reject) => {
        fse.copy(file, path.resolve(configs.args.outputDir, file), (err) => {
            if (err) reject(err); else resolve();
        });
    });
}
