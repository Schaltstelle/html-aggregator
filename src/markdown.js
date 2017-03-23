'use strict';
const marked = require('marked');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const template = require('./template');

let tags = [];
let schema;

module.exports = {
    registerTag: registerTag,
    run: run
};

registerTag('include', {
    kind: 'scalar',
    resolve: data => {
        return fs.existsSync(data);
    },
    construct: data => {
        let inc = fs.readFileSync(data, 'utf8');
        return (path.extname(data) === '.yaml' || path.extname(data) === '.yml')
            ? yaml.safeLoad(inc) : inc;
    }
});

function run(input, data) {
    let split = /^---\s*$/m.exec(input);
    let parts = (split === null)
        ? [input, '']
        : [input.substring(0, split.index), input.substring(split.index + split[0].length)];
    let inputYaml = '%TAG ! tag:ss_schema/\n---\n' + parts[0];
    let fullData = Object.assign({}, yaml.safeLoad(inputYaml, {schema: getSchema()}), data);
    fullData.content = marked(parts[1]);
    let templ = findTemplate(fullData);
    return templ
        ? template.run(templ.text, fullData).then(res => {
            return {data: res.data, ext: templ.ext};
        })
        : Promise.resolve({data: fullData, ext: '.html'});
}

function registerTag(name, config) {
    if (schema) {
        throw new Error('Tags must be registered before the first usage of "run".');
    }
    tags.push({name: name, config: config});
}

function getSchema() {
    return schema ? schema : yaml.Schema.create(tags.map(tag =>
            new yaml.Type('tag:ss_schema/' + tag.name, tag.config)));
}

function findTemplate(data) {
    if (data.template) {
        return {text: data.template, ext: '.html'}; //TODO a way to find out extname of !include?
    }
    if (data.templateFile) {
        return {text: fs.readFileSync(data.templateFile, 'utf8'), ext: path.extname(data.templateFile)};
    }
}