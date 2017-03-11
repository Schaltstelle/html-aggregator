"use strict";
const chalk = require('chalk');
const template = require('./template');
const aggregate = require('./aggregate');
const configs = require('./configs');
const moment = require('moment');
const glob = require('glob');
const path = require('path');

aggregate.registerParser('parseDate', (data, format) => {
    return moment(data, format).toDate();
});

template.registerHelper('formatDate', (date, format) => {
    return moment(date).format(format);
});

template.registerHelper('noNewlines', (data) => {
    return data ? data.replace(/[\n\r]/g, ' ') : '';
});

template.registerHelper('noLinks', (data) => {
    return data ? data.replace(/<a( .*?)?>(.*?)<\/a>/g, '$2') : '';
});

template.registerHelper('aggregate', (url, parser, template, maxLen) => {
    return aggregate.run(url, parser, template, maxLen);
});

let c = configs.parseOrSet();
glob(c.pluginDir + '/**/*.js', (err, files) => {
    if (err) {
        console.log(chalk.red('Problem loading plugins: ' + err));
    } else {
        files.forEach(file => {
            console.log('Loading plugin', chalk.magenta(file));
            let relFile = path.relative(__dirname, file);
            require(relFile.substring(0, relFile.length - 3));
        });
    }
});
