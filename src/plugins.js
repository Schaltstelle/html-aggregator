"use strict";
const debug = require('debug')('plugins');
const chalk = require('chalk');
const template = require('./template');
const configs = require('./configs');
const moment = require('moment');
const glob = require('glob');
const path = require('path');

template.registerHelper('formatDate', (date, format) => {
    return moment(date).format(format);
});

template.registerHelper('noNewlines', (data) => {
    return data ? data.replace(/[\n\r]/g, ' ') : '';
});

template.registerHelper('noLinks', (data) => {
    return data ? data.replace(/<a( .*?)?>(.*?)<\/a>/g, '$2') : '';
});

module.exports = new Promise((resolve, reject) => {
    glob('_plugins/**/*.js', (err, files) => {
        if (err) {
            reject('Problem loading plugins: ' + err);
        } else {
            files.forEach(file => {
                debug('Loading', chalk.blue(file));
                let relFile = path.relative(__dirname, file);
                require(relFile.substring(0, relFile.length - 3));
            });
            resolve();
        }
    });
});
