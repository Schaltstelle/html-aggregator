'use strict';
const chalk = require('chalk');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const http = require('http');
const https = require('https');
const url = require('url');
const cheerio = require('cheerio');
const util = require('./util');

const args = util.parseArgs();
const parserDir = args.opts.parserDir || 'aggregator';
const template = args.opts.template || 'aggregator/template.html';
const outputDir = args.opts.outputDir || 'output';
const maxLen = parseInt(args.opts.maxLen) || 0;
const cacheDir = path.resolve(parserDir, 'cache');
const inputs = args.args;

console.log('inputs:     ', chalk.magenta(inputs));
console.log('parserDir:  ', chalk.magenta(parserDir));
console.log('template:   ', chalk.magenta(template));
console.log('outputDir:  ', chalk.magenta(outputDir));
console.log('cacheDir:   ', chalk.magenta(cacheDir));
console.log('maxLen:     ', chalk.magenta(maxLen));

fse.mkdirsSync(cacheDir);
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
            console.log('Searching   ', chalk.magenta(urlMatch[1]));
            let cache = path.resolve(cacheDir, filenameSafe(urlMatch[1]));
            let doLoad = fs.existsSync(cache) ? readFile(cache) : load(urlMatch[1], outputDir);
            doLoad.then(data => {
                fs.writeFileSync(cache, data);
                let info = parse(urlMatch[1], data, parsers[templateMatch[1]]);
                let pos = input.indexOf(rest, index);
                replacements.push({from: index - 12, to: pos + rest.length, with: info});
            }).catch(err => {
                console.log(chalk.red(err));
            }).then(() => {
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
            });
        }(file, data, res[2], res.index));
    }
});

function filenameSafe(s) {
    return s.replace(/[/\\:*?"<>|]/g, '-');
}

function readFile(path) {
    console.log('       found', chalk.magenta(path));
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                reject('could not read ' + filename + ': ' + err);
            } else {
                resolve(data);
            }
        })
    });
}

function readParsers(dir) {
    let res = {};
    fs.readdirSync(dir).forEach(file => {
        if (file.substring(file.length - 5) === '.json') {
            res[file.substring(0, file.length - 5)] = JSON.parse(fs.readFileSync(path.resolve(dir, file), 'utf8'));
        }
    });
    return res;
}

function load(addr, basedir) {
    if (addr.substring(0, 4) !== 'http') {
        let filename = path.resolve(basedir, addr);
        return readFile(filename);
    }
    return get(addr).then(res => res.data);
}

function parse(addr, data, template) {
    const tags = cheerio.load(data);
    let info = Object.assign({url: addr}, template.static);
    for (let select in template.selectors) {
        info[select] = applySelector(addr, tags, template.selectors[select]);
    }
    return info;
}

function applySelector(addr, tags, selector) {
    if (Array.isArray(selector)) {
        let applied = selector.slice();
        applied[1] = extract(addr, tags, selector[1]);
        return util.parse.apply(null, applied);
    }
    return extract(addr, tags, selector);
}

function extract(addr, tags, selector) {
    let elem = /(.*?) \[(.*?)]$/.exec(selector);
    if (elem) {
        let tag = tags(elem[1]);
        let attr = tag.attr(elem[2]);
        if (tag.get(0).tagName === 'img' && elem[2] === 'src') {
            attr = relative(attr, addr);
        }
        return attr;
    }
    return convertToHtml(addr, tags(selector));
}

function convertToHtml(addr, elems) {
    elems.find('a').each((i, e) => {
        let ee = cheerio(e);
        ee.attr('href', relative(ee.attr('href'), addr));
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
    let rel = href;
    if (href && !href.match('^https?://')) {
        if (href.substring(0, 1) === '#') {
            rel = base + href;
        } else if (href.substring(0, 1) === '/') {
            rel = base.substring(0, base.indexOf('/', 8)) + href;
        } else {
            rel = base.substring(0, base.lastIndexOf('/') + 1) + href;
        }
    }
    return path.normalize(rel);
}

function get(addr) {
    console.log('       found', chalk.magenta(addr));
    return new Promise((resolve, reject) => {
        let options = Object.assign({}, url.parse(addr), {
            headers: {
                accept: 'text/html',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
            }
        });
        let client = options.protocol === 'https:' ? https : http;
        const req = client.request(options, resp => {
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