'use strict';
const chalk = require('chalk');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const http = require('http');
const cheerio = require('cheerio');
const util = require('./util');

const args = util.parseArgs();
const parserDir = args.opts.parserDir || 'aggregator';
const template = args.opts.template || 'aggregator/template.html';
const outputDir = args.opts.outputDir || 'output';
const maxLen = parseInt(args.opts.maxLen) || 0;
const inputs = args.args;

console.log('inputs:     ', chalk.magenta(inputs));
console.log('parserDir:  ', chalk.magenta(parserDir));
console.log('template:   ', chalk.magenta(template));
console.log('outputDir:  ', chalk.magenta(outputDir));
console.log('maxLen:     ', chalk.magenta(maxLen));

const parsers = readParsers(parserDir);
const templateFile = fs.readFileSync(template, 'utf8');
inputs.forEach(file => {
    let data = fs.readFileSync(file, 'utf8');
    let regex = /<aggregate (.*?)>([^]*?<\/aggregate>)/g;
    let res;
    let scraping = 0;
    let replacements = [];
    while ((res = regex.exec(data)) !== null) {
        let urlMatch = /url\s*=\s*"(.*?)"/.exec(res[1]);
        if (!urlMatch) {
            console.log(chalk.red('no url attribute found in ' + file + ': ' + res[1]));
            continue;
        }
        let templateMatch = /template\s*=\s*"(.*?)"/.exec(res[1]);
        if (!templateMatch) {
            console.log(chalk.red('no template attribute found in ' + file + ': ' + res[1]));
            continue;
        }
        scraping++;
        (function (file, input, rest, index) {
            load(urlMatch[1], outputDir)
                .then(data => {
                    let info = parse(urlMatch[1], data, parsers[templateMatch[1]]);
                    let pos = input.indexOf(rest, index);
                    replacements.push({from: index - 12, to: pos + rest.length, with: info});
                    if (--scraping === 0) {
                        replacements.sort((a, b) => b.from - a.from);
                        for (let i = 0; i < replacements.length; i++) {
                            let rep = replacements[i];
                            rep.with.parity = (replacements.length - i) % 2 === 1 ? 'even' : 'odd';
                            input = input.substring(0, rep.from) + util.template(templateFile, rep.with) + input.substring(rep.to);
                        }
                        let outfile = path.resolve(outputDir, path.basename(file));
                        fse.mkdirsSync(path.dirname(outfile));
                        fs.writeFileSync(outfile, input);
                        console.log('Wrote       ', chalk.blue(path.relative('.', outfile)));
                    }
                })
                .catch(err => {
                    console.log(chalk.red(err));
                });
        }(file, data, res[2], res.index));
    }
});

function readParsers(dir) {
    let res = {};
    fs.readdirSync(dir).forEach(file => {
        if (file.substring(file.length - 5) === '.json') {
            res[file.substring(0, file.length - 5)] = JSON.parse(fs.readFileSync(path.resolve(dir, file), 'utf8'));
        }
    });
    return res;
}

function load(url, basedir) {
    if (url.substring(0, 4) !== 'http') {
        return new Promise((resolve, reject) => {
            let filename = path.resolve(basedir, url);
            fs.readFile(filename, (err, data) => {
                if (err) {
                    reject('could not read ' + filename + ': ' + err);
                } else {
                    resolve(data);
                }
            });
        });
    }
    return get(url).then(res => res.data);
}

function parse(url, data, template) {
    const tags = cheerio.load(data);
    let info = Object.assign({url: url}, template.static);
    for (let select in template.selectors) {
        info[select] = applySelector(url, tags, template.selectors[select]);
    }
    return info;
}

function applySelector(url, tags, selector) {
    if (Array.isArray(selector)) {
        let applied = selector.slice();
        applied[1] = convertToHtml(tags(selector[1]), url);
        return util.parse.apply(null, applied);
    }
    return convertToHtml(tags(selector), url);
}

function convertToHtml(elems, url) {
    elems.find('a').each((i, e) => {
        let ee = cheerio(e);
        ee.attr('href', relative(ee.attr('href'), url));
    });
    let val = elems.html();
    if (maxLen > 0 && val && val.length > maxLen) {
        let pos = val.indexOf('</p>', maxLen);
        if (pos > 0) {
            val = val.substring(0, pos + 4);
        }
    }
    return val;
}

function relative(href, base) {
    if (href && !href.match('^https?://')) {
        if (href.substring(0, 1) === '#') {
            href = base + href;
        } else if (href.substring(0, 1) === '/') {
            href = base.substring(0, base.indexOf('/', 8)) + href;
        } else {
            href = base.substring(0, base.lastIndexOf('/') + 1) + href;
        }
    }
    return href;
}

function get(url) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, resp => {
            let body = '';
            resp.on('data', d => body += d);
            resp.on('end', () => resolve({
                data: body,
                statusCode: resp.statusCode,
                headers: resp.headers
            }));
        });

        req.on('error', err => reject(err.message));
        req.end();
    });
}