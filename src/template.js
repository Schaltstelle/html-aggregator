'use strict';
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const promBars = require('promised-handlebars');
const handlebars = promBars(require('handlebars'));
const glob = require('glob');
const configs = require('./configs');

module.exports = {
    registerHelper(name, func){
        handlebars.registerHelper(name, func);
    },

    string: string,
    file: file,
    run: run
};

function run(config) {
    let c = configs.parseOrSet(config);
    return file(c.args[0], c, c.outputDir);
}

function file(file, data, out, isOutName) {
    return string(fs.readFileSync(file, 'utf8'), data).then(output => {
        let outfile = resolveFile(file, out, isOutName);
        fs.writeFileSync(outfile, output);
        console.log('[template] Wrote         ', chalk.blue(outfile));
    });
}

function resolveFile(file, out, isOutName) {
    if (isOutName) {
        let outParts = path.parse(out);
        fse.mkdirsSync(outParts.dir);
        return path.resolve(outParts.dir, outParts.name + path.extname(file));
    }
    let outParts = path.parse(path.resolve(out, file));
    fse.mkdirsSync(outParts.dir);
    return path.resolve(outParts.dir, outParts.base);
}

function string(input, data) {
    return handlebars.compile(input)(data);
}
