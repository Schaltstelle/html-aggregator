'use strict';
const chalk = require('chalk');
const marked = require('marked');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const yaml = require('js-yaml');
const glob = require('glob');
const util = require('./util');

const args = util.parseArgs();
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
                let split = /^---\s*$/m.exec(raw);
                if (split === null) {
                    console.log(chalk.red('--- not found in ' + input));
                } else {
                    let data = yaml.safeLoad(raw.substring(0, split.index));
                    data.content = marked(raw.substring(split.index + split[0].length));
                    let output = util.template(fs.readFileSync(data.template, 'utf8'), data);
                    let outParts = path.parse(path.resolve(outputDir, path.relative(input, file)));
                    fse.mkdirsSync(outParts.dir);
                    let ext = path.extname(data.template);
                    let outfile = path.resolve(outParts.dir, outParts.name + ext);
                    fs.writeFileSync(outfile, output);
                    console.log('Wrote       ', chalk.blue(path.relative('.', outfile)));
                }
            });
        }
    });
});