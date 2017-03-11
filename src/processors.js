'use strict';

const template = require('./template');
const markdown = require('./markdown');
const aggregate = require('./aggregate');
const configs = require('./configs');
const glob = require('glob');
const path = require('path');
const fse = require('fs-extra');

let procs = {};

module.exports = {
    registerProcessor: registerProc,
    run: function (config) {
        configs.parseOrSet(config);
        return new Promise((resolve, reject) => {
            glob('**', {
                nodir: true,
                ignore: ['node_modules/**', configs.args.outputDir + '/**', '_*/**'].concat(configs.args.exclude)
            }, (err, files) => {
                if (err) {
                    reject(err);
                }
                resolve(Promise.all(files.map(file => findProc(file)(file))));
            });
        });
    }
};

registerProc('\.md$', (file) => {
    markdown.run(file, configs.args.outputDir);
});

registerProc('\.html$', (file) => {
    template.file(file, configs.args, configs.args.outputDir);
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
