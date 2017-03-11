"use strict";
const template = require('./template');
const markdown = require('./markdown');
const aggregate = require('./aggregate');
const procs = require('./processors');

module.exports = {
    templateString: template.string,
    templateFile: template.file,
    template: template.run,
    markdown: markdown.run,
    run: procs.run,
    registerHelper: template.registerHelper,
    registerParser: aggregate.registerParser,
    registerProcessor: procs.registerProcessor
};

