'use strict';
const chalk = require('chalk');
const promBars = require('promised-handlebars');
const moment = require('moment');
const aggregate = require('./aggregate');

let parseFuncs = {};

module.exports = {

    help: function () {
        console.log('Usage:', chalk.magenta('html-aggregator'), chalk.blue('command'), chalk.red('options'));
        console.log(chalk.blue('markdown'), '       Create HTML from markdown.');
    },

    template: function (source, data) {
        return promBars.compile(source)(data);
    },

    parse: function (func, data, params) {
        let parser = parseFuncs[func];
        if (!parser) {
            console.log(chalk.red('Ignoring unknown parse function ' + func));
            return data;
        }
        return parser.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

promBars.registerHelper('formatDate', (date, format) => {
    return moment(date).format(format);
});
promBars.registerHelper('noNewlines', (data) => {
    return data.replace(/[\n\r]/g, ' ');
});
promBars.registerHelper('noLinks', (data) => {
    return data.replace(/<a .*?>(.*?)<\/a>/g, '$1');
});
promBars.registerHelper('aggregate', (url, parser, template, maxLen) => {
    return aggregate.run(url, parser, template, maxLen);
});

parseFuncs['parseDate'] = (data, format) => {
    return moment(data, format).toDate();
};
