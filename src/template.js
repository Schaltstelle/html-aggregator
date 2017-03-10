'use strict';
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const promBars = require('promised-handlebars');
const handlebars = promBars(require('handlebars'));

module.exports = {
    registerHelper(name, func){
        handlebars.registerHelper(name, func);
    },

    string: string,
    file: file,
};

function file(input, data, out) {
    return string(fs.readFileSync(input, 'utf8'), data).then(output => {
        let outParts = path.parse(out);
        fse.mkdirsSync(outParts.dir);
        let ext = path.extname(input);
        let outfile = path.resolve(outParts.dir, outParts.name + ext);
        fs.writeFileSync(outfile, output);
        console.log('Wrote       ', chalk.blue(path.relative('.', outfile)));
    });
}

function string(input, data) {
    return handlebars.compile(input)(data);
}
