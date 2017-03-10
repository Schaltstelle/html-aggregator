'use strict';
const chalk = require('chalk');
const marked = require('marked');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const yaml = require('js-yaml');
const glob = require('glob');
const configs = require('./configs');
const promBars = require('promised-handlebars');
const handlebars = promBars(require('handlebars'));

module.exports = {
    template: template,

    registerHelper(name, func){
        handlebars.registerHelper(name, func);
    },
    run: function (config) {
        let c = configs.parseOrSet(config);
        console.log('inputs:     ', chalk.magenta(c.args));
        console.log('outputDir:  ', chalk.magenta(c.opts.outputDir));
        return run(c);
    }
};

function template(source, data) {
    return handlebars.compile(source)(data);
}

function run(config) {
    let pending = 0;
    return new Promise((resolve, reject) => {
        config.args.forEach(input => {
            glob(input + '/**/*.md', (err, files) => {
                if (err) {
                    console.log(chalk.red(err));
                } else {
                    files.forEach(file => {
                        let raw = fs.readFileSync(file, 'utf8');
                        let split = /^---\s*$/m.exec(raw);
                        if (split === null) {
                            console.log(chalk.red('--- not found in ' + input));
                        } else {
                            let data = yaml.safeLoad(raw.substring(0, split.index));
                            data.content = marked(raw.substring(split.index + split[0].length));
                            pending++;
                            template(fs.readFileSync(data.template, 'utf8'), data).then(output => {
                                let outParts = path.parse(path.resolve(config.opts.outputDir, path.relative(input, file)));
                                fse.mkdirsSync(outParts.dir);
                                let ext = path.extname(data.template);
                                let outfile = path.resolve(outParts.dir, outParts.name + ext);
                                fs.writeFileSync(outfile, output);
                                console.log('Wrote       ', chalk.blue(path.relative('.', outfile)));
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