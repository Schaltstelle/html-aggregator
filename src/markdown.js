'use strict';
const marked = require('marked');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const template = require('./template');
const configs = require('./configs');

module.exports = {
    run: run
};

function run(baseDir, file, outputDir) {
    let full = path.resolve(baseDir, file);
    let raw = fs.readFileSync(full, 'utf8');
    let split = /^---\s*$/m.exec(raw);
    if (split === null) {
        return Promise.reject('--- not found in ' + full);
    }
    let data = Object.assign({}, configs.args, yaml.safeLoad(raw.substring(0, split.index)));
    data.content = marked(raw.substring(split.index + split[0].length));
    return template.file(baseDir, data.template, data, path.resolve(outputDir, file), true);
}

