'use strict';
const chalk = require('chalk');
const handlebars = require('handlebars');

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
    }
};
