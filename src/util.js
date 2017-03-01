'use strict';
const chalk = require('chalk');
const handlebars = require('handlebars');
const moment = require('moment');

let parseFuncs = {};

module.exports = {

    help: function () {
        console.log('Usage:', chalk.magenta('html-aggregator'), chalk.blue('command'), chalk.red('options'));
        console.log(chalk.blue('aggregate'), '      Aggregate HTML snippets.');
        console.log(chalk.blue('markdown'), '       Create HTML from markdown.');
    },

    parseArgs: function () {
        let res = {opts: {}, args: []};
        for (let i = 3; i < process.argv.length; i++) {
            let arg = process.argv[i];
            if (arg.substring(0, 2) === '--') {
                let parts = arg.split('=');
                res.opts[parts[0].substring(2)] = (parts.length === 2) ? parts[1] : null;
            } else {
                res.args.push(arg);
            }
        }
        return res;
    },

    template: function (source, data) {
        return handlebars.compile(source)(data);
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

handlebars.registerHelper('formatDate', (date, format) => {
    return moment(date).format(format);
});
handlebars.registerHelper('noNewline', (data) => {
    return data.replace(/[\n\r]/g,' ');
});

parseFuncs['parseDate'] = (data, format) => {
    return moment(data, format).toDate();
};
