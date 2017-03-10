'use strict';
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const promBars = require('promised-handlebars');
const handlebars = promBars(require('handlebars'));
const glob = require('glob');

module.exports = {
    registerHelper(name, func){
        handlebars.registerHelper(name, func);
    },

    string: string,
    file: file,
};

function file(inPattern, data, out, isOutName) {
    return new Promise((resolve, reject) => {
        glob(inPattern, (err, files) => {
            if (err) {
                reject(err);
            }
            resolve(Promise.all(files.map(file =>
                string(fs.readFileSync(file, 'utf8'), data).then(output => {
                    let outfile = resolveFile(file, out, isOutName);
                    fs.writeFileSync(outfile, output);
                    console.log('Wrote       ', chalk.blue(path.relative('.', outfile)));
                })
            )));
        });
    });
}

function resolveFile(file, out, isOutName) {
    if (isOutName) {
        let outParts = path.parse(out);
        fse.mkdirsSync(outParts.dir);
        return path.resolve(outParts.dir, outParts.name + path.extname(file));
    }
    fse.mkdirsSync(out);
    return path.resolve(out, path.basename(file));
}

function string(input, data) {
    return handlebars.compile(input)(data);
}
