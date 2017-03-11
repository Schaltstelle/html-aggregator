"use strict";
const template = require('./template');
const markdown = require('./markdown');
const aggregate = require('./aggregate');
const configs = require('./configs');
require('./plugins');

module.exports = {
    templateString: template.string,
    templateFile: template.file,
    template: function () {
        let c = configs.parseOrSet();
        template.file(c.args[0], c, c.outputDir).catch((err) => {
            throw err;
        });
    },
    markdown: markdown.run,
    registerHelper: template.registerHelper,
    registerParser: aggregate.registerParser
};
