"use strict";
const configs = require('./configs');
const template = require('./template');
const markdown = require('./markdown');
const procs = require('./processors');

module.exports = {
    init: function (config) {
        configs.add(config);
        return require('./plugins');
    },
    configs: configs.args,
    addConfig: configs.add,
    templateString: template.string,
    templateFile: template.file,
    template: template.run,
    markdown: markdown.run,
    run: procs.run,
    registerHelper: template.registerHelper,
    registerProcessor: procs.registerProcessor
};

