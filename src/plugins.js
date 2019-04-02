"use strict";
const debug = require('debug')('plugins');
const chalk = require('chalk');
const template = require('./template');
const procs = require('./processors');
const configs = require('./configs');
const moment = require('moment');
const glob = require('glob');
const path = require('path');
const fs = require('fs');

module.exports = new Promise((resolve, reject) => {
    glob('_plugins/**/*.js', (err, files) => {
        if (err) {
            reject('Problem loading plugins: ' + err);
        } else {
            Promise.all(files.map(file => {
                debug('Loading', chalk.blue(file));
                let relFile = path.relative(__dirname, file);
                try {
                    let res = require(relFile.substring(0, relFile.length - 3));
                    return res.then ? res : Promise.resolve();
                } catch(e) {
                    return Promise.reject(e);
                }
            })).then(resolve, reject);
        }
    });
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

template.registerHelper('noTags', (data) => {
    return data ? data.replace(/<(.*?)( .*?)?>(.*?)<\/\1>/g, '$3').replace(/<(.*?)\/>/g,'') : '';
});

template.registerHelper('include', function (name, config) {
    return procs.processorFor(name)
        .exec(fs.readFileSync(name, 'utf8'), Object.assign({}, this, config.hash))
        .then(res => res.data);
});
