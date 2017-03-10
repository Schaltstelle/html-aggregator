"use strict";
const markdown = require('./markdown');
const aggregate = require('./aggregate');
const moment = require('moment');

module.exports = {
    markdown: function (source, data) {
        markdown.template(source, data)
    },
    markdownAll: function (config) {
        markdown.run(config)
    },
    registerHelper: function (name, func) {
        markdown.registerHelper(name, func);
    },
    registerParser:function(name, func){
        aggregate.registerParser(name, func);
    }
};

aggregate.registerParser('parseDate', (data, format) => {
    return moment(data, format).toDate();
});

markdown.registerHelper('formatDate', (date, format) => {
    return moment(date).format(format);
});

markdown.registerHelper('noNewlines', (data) => {
    return data.replace(/[\n\r]/g, ' ');
});

markdown.registerHelper('noLinks', (data) => {
    return data.replace(/<a .*?>(.*?)<\/a>/g, '$1');
});

markdown.registerHelper('aggregate', (url, parser, template, maxLen) => {
    return aggregate.run(url, parser, template, maxLen);
});


