'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

let tags = [];
let schema;

module.exports = {
    load: load,
    registerTag: registerTag
};

registerTag('include', {
    kind: 'scalar',
    resolve: data => {
        return fs.existsSync(data);
    },
    construct: data => {
        let inc = fs.readFileSync(data, 'utf8');
        return (path.extname(data) === '.yaml' || path.extname(data) === '.yml')
            ? load(inc) : inc;
    }
});

function load(input) {
    return yaml.safeLoad('%TAG ! tag:ss_schema/\n---\n' + input, {schema: getSchema()});
}

function getSchema() {
    if (!schema) {
        schema = yaml.Schema.create(tags.map(tag => new yaml.Type('tag:ss_schema/' + tag.name, tag.config)));
    }
    return schema;
}

function registerTag(name, config) {
    if (schema) {
        throw new Error('Tags must be registered before the first usage of "load".');
    }
    tags.push({name: name, config: config});
}
