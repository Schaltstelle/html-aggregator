'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const cheerio = require('cheerio');

const args = parseArgs();
const templateDir = args.opts.templateDir || 'aggregator/templates';
const outputFile = args.opts.output || 'aggregator/output.html';
const maxLen = parseInt(args.opts.maxLen) || 0;
const inputs = args.args;

function parseArgs() {
    let res = {opts: {}, args: []};
    for (let i = 2; i < process.argv.length; i++) {
        let arg = process.argv[i];
        if (arg.substring(0, 2) === '--') {
            let parts = arg.split('=');
            res.opts[parts[0].substring(2)] = (parts.length === 2) ? parts[1] : null;
        } else {
            res.args.push(arg);
        }
    }
    return res;
}

console.log('inputs:     ', inputs);
console.log('templateDir:', templateDir);
console.log('output:     ', outputFile);
console.log('max-len:    ', maxLen);

const templates = readTemplates(templateDir);
const output = readOutput(outputFile);
inputs.forEach(file => {
    let data = fs.readFileSync(file).toString();
    let regex = /<aggregate (.*?)>([^]*?<\/aggregate>)/g;
    let res;
    let scraping = 0;
    let replacements = [];
    while ((res = regex.exec(data)) !== null) {
        let urlMatch = /url\s*=\s*"(.*?)"/.exec(res[1]);
        if (!urlMatch) {
            console.log('no url attribute found in ' + file + ': ' + res[1]);
            continue;
        }
        let templateMatch = /template\s*=\s*"(.*?)"/.exec(res[1]);
        if (!templateMatch) {
            console.log('no template attribute found in ' + file + ': ' + res[1]);
            continue;
        }
        scraping++;
        (function (file, input, rest, index) {
            scrape(urlMatch[1], templates[templateMatch[1]]).then(info => {
                let pos = input.indexOf(rest, index);
                replacements.push(appPos(file) < 0
                    ? {from: pos, to: pos + rest.length - 12, with: info}
                    : {from: index - 12, to: pos + rest.length, with: info});
                if (--scraping === 0) {
                    replacements.sort((a, b) => b.from - a.from);
                    for (let i = 0; i < replacements.length; i++) {
                        let rep = replacements[i];
                        rep.with.parity = i % 2 === 0 ? 'even' : 'odd';
                        input = input.substring(0, rep.from) + replace(output, rep.with) + input.substring(rep.to);
                    }
                    writeFile(file, input);
                }
            });
        }(file, data, res[2], res.index));
    }
});

function appPos(file) {
    return file.indexOf('.html.');
}

function writeFile(file, data) {
    let pos = appPos(file);
    let out = pos < 0 ? file : file.substring(0, pos + 5);
    fs.writeFileSync(out, data);
}

function readTemplates(dir) {
    let res = {};
    fs.readdirSync(dir).forEach(file =>
        res[path.basename(file, '.json')] = JSON.parse(fs.readFileSync(path.resolve(dir, file)).toString()));
    return res;
}

function readOutput(name) {
    return fs.readFileSync(name).toString();
}

function scrape(url, template) {
    return get(url).then(res => {
        try {
            const data = cheerio.load(res.data);
            let info = Object.assign({url: url}, template.static);
            for (let select in template.selectors) {
                info[select] = convertToHtml(data(template.selectors[select]), url);
            }
            return info;
        } catch (e) {
            console.log(e);
        }
    });
}

function convertToHtml(elems, url) {
    elems.find('a').each((i, e) => {
        let ee = cheerio(e);
        ee.attr('href', relativize(ee.attr('href'), url));
    });
    let val = elems.html();
    if (maxLen > 0 && val && val.length > maxLen) {
        let pos = val.indexOf('</p>', maxLen);
        if (pos > 0) {
            val = val.substring(0, pos + 4) + '<p>...</p>';
        }
    }
    return val;
}

function relativize(href, base) {
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

function replace(input, data) {
    for (let p in data) {
        input = input.replace(new RegExp('%' + p + '%', 'g'), data[p]);
    }
    return input;
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