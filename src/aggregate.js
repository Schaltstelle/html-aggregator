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
const config = require('./config');

module.exports = {
    run: function (url, parser, template, maxLen) {
        fse.mkdirsSync(config.cacheDir());
        const parsers = readParsers(config.parserDir());
        const templateFile = fs.readFileSync(template, 'utf8');
        console.log('Searching   ', chalk.blue(url));
        let cache = path.resolve(config.cacheDir(), filenameSafe(url));
        let doLoad = fs.existsSync(cache) ? readFile(cache) : load(url, config.outputDir());
        return doLoad.then(data => {
            fs.writeFileSync(cache, data);
            let info = parse(url, data, parsers[parser], maxLen);
            // info.parity = (replacements.length - i) % 2 === 1 ? 'even' : 'odd';
            return util.template(templateFile, info);
        });
    }
};

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
        return util.parse.apply(null, applied);
    }
    return extract(addr, tags, selector, maxLen);
}

function extract(addr, tags, selector, maxLen) {
    let elem = /(.*?) \[(.*?)]$/.exec(selector);
    if (elem) {
        let tag = tags(elem[1]);
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