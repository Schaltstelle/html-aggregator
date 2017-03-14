'use strict';
const marked = require('marked');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const template = require('./template');

module.exports = {
    run: function (input, data) {
        let split = /^---\s*$/m.exec(input);
        if (split === null) {
            return Promise.reject('--- not found');
        }
        let d = Object.assign({}, data, yaml.safeLoad(input.substring(0, split.index)));
        d.content = marked(input.substring(split.index + split[0].length));
        let temp = fs.readFileSync(d.template, 'utf8');
        return template.run(temp, d).then(res => {
            return {data: res.data, ext: path.extname(d.template)};
        });
    }
};

