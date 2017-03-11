'use strict';
const debug = require('debug')('aggregate');
const chalk = require('chalk');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const request = require('request');
const url = require('url');
const cheerio = require('cheerio');
const template = require('./template');
const configs = require('./configs');

let parseFuncs = {};

module.exports = {
    run: function (url, parser, template, maxLen) {
        return run(url, parser, template, maxLen, configs.args);
    },
    registerParser(name, func){
        parseFuncs[name] = func;
    }
};

function run(url, parser, templ, maxLen, config) {
    fse.mkdirsSync(config.cacheDir);
    const parsers = readParsers(config.parserDir);
    const templateFile = fs.readFileSync(templ, 'utf8');
    debug('Searching', chalk.blue(url));
    let cache = path.resolve(config.cacheDir, filenameSafe(url));
    let doLoad = fs.existsSync(cache) ? readFile(cache) : load(url, '.');
    return doLoad.then(data => {
        fs.writeFileSync(cache, data);
        let info = parse(url, data, parsers[parser], maxLen);
        return template.string(templateFile, info);
    });
}

function filenameSafe(s) {
    return s.replace(/[/\\:*?"<>|]/g, '-');
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                debug('Found', chalk.magenta(path.relative('', file)));
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
    return get(addr);
}

function parse(addr, data, template, maxLen) {
    const tags = cheerio.load(data);
    let info = Object.assign({url: addr}, template.static);
    for (let select in template.selectors) {
        info[select] = applySelector(addr, tags, template.selectors[select], maxLen);
    }
    return info;
}

function applySelector(addr, tags, selector, maxLen) {
    if (Array.isArray(selector)) {
        let applied = selector.slice();
        applied[1] = extract(addr, tags, selector[1], maxLen);
        return parseFunc.apply(null, applied);
    }
    return extract(addr, tags, selector, maxLen);
}

function parseFunc(func, data, params) {
    let parser = parseFuncs[func];
    if (!parser) {
        debug(chalk.red('Ignoring unknown parse function ' + func));
        return data;
    }
    return parser.apply(null, Array.prototype.slice.call(arguments, 1));
}

function extract(addr, tags, selector, maxLen) {
    let elem = /(.*?) \[(.*?)]$/.exec(selector);
    if (elem) {
        let tag = tags(elem[1]);
        if (tag.length === 0) {
            debug(chalk.red('tag "' + elem[1] + '" not found.'));
            return '';
        }
        let attr = tag.attr(elem[2]);
        if (tag.get(0).tagName === 'img' && elem[2] === 'src') {
            attr = relative(attr, addr);
        }
        return attr;
    }
    return convertToHtml(addr, tags(selector), maxLen);
}

function convertToHtml(addr, elems, maxLen) {
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
    return path.normalize(rel).replace(/(https?:\/)([^/])/, '$1/$2');
}

function get(addr) {
    debug('Loading', chalk.magenta(addr));
    return new Promise((resolve, reject) => {
        let options = {
            url: addr,
            headers: {
                accept: 'text/html',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
            }
        };
        request(options, (err, res, body) => {
            if (err) {
                reject(err);
            } else if (res.statusCode !== 200) {
                reject('Got response code ' + res.statusCode);
            } else {
                resolve(body);
            }
        });
    });
}