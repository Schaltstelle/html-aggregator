'use strict';
const chalk = require('chalk');
const marked = require('marked');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const yaml = require('js-yaml');
const glob = require('glob');
const configs = require('./configs');
const template = require('./template');

module.exports = {
    run: function (config) {
        let c = configs.parseOrSet(config);
        console.log('inputs:     ', chalk.magenta(c.args));
        console.log('outputDir:  ', chalk.magenta(c.outputDir));
        return run(c);
    }
};

function run(config) {
    let pending = 0;
    return new Promise((resolve, reject) => {
        config.args.forEach(input => {
            glob(input + '/**/*.md', (err, files) => {
                if (err) {
                    console.log(chalk.red(err));
                } else {
                    files.forEach(f => {
                        let raw = fs.readFileSync(f, 'utf8');
                        let split = /^---\s*$/m.exec(raw);
                        if (split === null) {
                            console.log(chalk.red('--- not found in ' + f));
                        } else {
                            let data = yaml.safeLoad(raw.substring(0, split.index));
                            data.content = marked(raw.substring(split.index + split[0].length));
                            pending++;
                            template.file(data.template, data, path.resolve(config.outputDir, path.relative(input, f)),true).then(() => {
                                if (--pending === 0) {
                                    resolve();
                                }
                            });
                        }
                    });
                }
            });
        });
    });
}
