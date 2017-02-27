'use strict';
const chalk = require('chalk');
const marked = require('marked');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const yaml = require('js-yaml');
const glob = require('glob');

const args = require('./util').parseArgs();
const inputs = args.args;
const outputDir = args.opts.outputDir || 'output';

console.log('inputs:     ', chalk.magenta(inputs));
console.log('outputDir:  ', chalk.magenta(outputDir));

inputs.forEach(input => {
    glob(input + '/**/*.md', (err, files) => {
        if (err) {
            console.log(chalk.red(err));
        } else {
            files.forEach(file => {
                let raw = fs.readFileSync(file, 'utf8');
                let split = raw.indexOf('\n---\n');
                if (split < 0) {
                    console.log(chalk.red('--- not found in ' + input));
                } else {
                    let data = yaml.safeLoad(raw.substring(0, split));
                    data.content = marked(raw.substring(split + 5));
                    let template = fs.readFileSync(data.template, 'utf8');
                    let variable = /%([a-zA-Z0-9.]+)%/g;
                    let res;
                    while ((res = variable.exec(template)) !== null) {
                        template = template.substring(0, res.index) + data[res[1]] + template.substring(res.index + res[0].length);
                    }
                    let outParts = path.parse(path.resolve(outputDir, path.relative(input, file)));
                    fse.mkdirsSync(outParts.dir);
                    let ext = path.extname(data.template);
                    let outfile = path.resolve(outParts.dir, outParts.name + ext);
                    fs.writeFileSync(outfile, template);
                    console.log('Wrote       ', chalk.blue(path.relative('.', outfile)));
                }
            });
        }
    });
});