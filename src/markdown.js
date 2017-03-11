'use strict';
const marked = require('marked');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const template = require('./template');

module.exports = {
    run: run
};

function run(file, outputDir) {
    let raw = fs.readFileSync(file, 'utf8');
    let split = /^---\s*$/m.exec(raw);
    if (split === null) {
        return Promise.reject('--- not found in ' + file);
    }
    let data = yaml.safeLoad(raw.substring(0, split.index));
    data.content = marked(raw.substring(split.index + split[0].length));
    return template.file(data.template, data, path.resolve(outputDir, file), true);
}

