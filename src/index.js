"use strict";
const template = require('./template');
const markdown = require('./markdown');
const aggregate = require('./aggregate');
const moment = require('moment');

module.exports = {
    templateString: template.string,
    templateFile: template.file,
    markdown: markdown.run,
    registerHelper: template.registerHelper,
    registerParser: aggregate.registerParser
};

aggregate.registerParser('parseDate', (data, format) => {
    return moment(data, format).toDate();
});

template.registerHelper('formatDate', (date, format) => {
    return moment(date).format(format);
});

template.registerHelper('noNewlines', (data) => {
    return data.replace(/[\n\r]/g, ' ');
});

template.registerHelper('noLinks', (data) => {
    return data.replace(/<a( .*?)?>(.*?)<\/a>/g, '$2');
});

template.registerHelper('aggregate', (url, parser, template, maxLen) => {
    return aggregate.run(url, parser, template, maxLen);
});


