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
    template: template.run,
    markdown: markdown.run,
    run: procs.run,
    processorFor: procs.processorFor,
    registerHelper: template.registerHelper,
    registerProcessor: procs.registerProcessor,
    registerTag: markdown.registerTag
};
