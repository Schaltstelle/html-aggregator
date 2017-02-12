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
            if (parts.length === 2) {
                res.opts[parts[0].substring(2)] = parts[1];
            } else {
                res.opts[parts[0].substring(2)] = null;
            }
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
for (let i = 0; i < inputs.length; i++) {
    let input = fs.readFileSync(inputs[i]).toString();
    let regex = /<aggregate (.*?)>([^]*?<\/aggregate>)/g;
    let res;
    let scraping = 0;
    let replacements = [];
    while ((res = regex.exec(input)) !== null) {
        let urlMatch = /url\s*=\s*"(.*?)"/.exec(res[1]);
        if (!urlMatch) {
            console.log('no url attribute found in ' + inputs[i] + ': ' + res[1]);
            continue;
        }
        let templateMatch = /template\s*=\s*"(.*?)"/.exec(res[1]);
        if (!templateMatch) {
            console.log('no template attribute found in ' + inputs[i] + ': ' + res[1]);
            continue;
        }
        scraping++;
        (function (file, input, rest, index) {
            scrape(urlMatch[1], templates[templateMatch[1]]).then(info => {
                let pos = input.indexOf(rest, index);
                replacements.push({from: pos, to: pos + rest.length - 12, with: info});
                if (--scraping === 0) {
                    replacements.sort((a, b) => b.from - a.from);
                    for (let i = 0; i < replacements.length; i++) {
                        let rep = replacements[i];
                        rep.with.parity = i % 2 === 0 ? 'even' : 'odd';
                        input = input.substring(0, rep.from) + replace(output, rep.with) + input.substring(rep.to);
                    }
                    fs.writeFileSync(file, input);
                }
            });
        }(inputs[i], input, res[2], res.index));
    }
}

function readTemplates(dir) {
    let res = {};
    const files = fs.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        let css = JSON.parse(fs.readFileSync(path.resolve(dir, files[i])).toString());
        let stat = css.static;
        css.static = undefined;
        res[path.basename(files[i], '.json')] = {css: css, static: stat};
    }
    return res;
}

function readOutput(name) {
    return fs.readFileSync(name).toString();
}

function scrape(url, template) {
    return get(url).then(res => {
        const data = cheerio.load(res.data);
        let info = {};
        for (let p in template.static) {
            info[p] = template.static[p];
        }
        for (let select in template.css) {
            let val = data(template.css[select]).html();
            if (maxLen > 0 && val && val.length > maxLen) {
                let pos = val.indexOf('</p>', maxLen);
                if (pos > 0) {
                    val = val.substring(0, pos + 4) + '<p>...</p>';
                }
            }
            info[select] = val;
        }
        return info;
    });
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