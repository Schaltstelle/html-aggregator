"use strict";

process.env.DEBUG = '*';

process.argv.push('simple');
process.argv.push('--boolean');
process.argv.push('--flag=value');

const assert = require('assert');
const fs = require('fs');
const fse = require('fs-extra');
const index = require('../src/index');
const template = require('../src/template');
const markdown = require('../src/markdown');
const configs = require('../src/configs');
const procs = require('../src/processors');

before(() => {
    index.init();
});

describe('configs', () => {
    it('should parse argv', () => {
        let c = configs.args;
        assert.deepEqual(c.args, ['simple']);
        assert.equal(c.env.PATH !== undefined, true);
        assert.equal(c.boolean, true);
        assert.equal(c.flag, 'value');
    });
});

describe('template', () => {
    it('should replace simple variables', () => {
        return template.run('x{{var}}y', {var: 42}).then(res => {
            assert.equal(res.data, 'x42y');
        });
    });
    it('should format dates', () => {
        return template.run('x{{formatDate var "DD.MM.YYYY"}}y', {var: new Date(2017, 2, 3)}).then(res => {
            assert.equal(res.data, 'x03.03.2017y');
        });
    });
    it('should remove newlines', () => {
        return template.run('x{{noNewlines "a\nb\rc\r\nd"}}y', {}).then(res => {
            assert.equal(res.data, 'xa b c  dy');
        });
    });
    it('should remove tags', () => {
        return template.run('{{noTags (noNewlines "practice <em class=\'markup--em markup--p-em\'>Everything\nas Code</em>? This<img/>")}}', {}).then(res => {
            assert.equal(res.data, 'practice Everything as Code? This');
        });
    });
    it('should remove link', () => {
        return template.run('x{{noLinks "a<a>nix</a>-<a href=\'hula\'>hula</a>"}}y', {}).then(res => {
            assert.equal(res.data, 'xanix-hulay');
        });
    });
    describe('include', () => {
        it('should include text files', () => {
            return template.run('x{{include "test/inc.txt"}}y', {}).then(res => {
                assert.equal(res.data, 'xhula\nhopy');
            });
        });
        it('should include processed md files', () => {
            return template.run('{{{include "test/data.md"}}}', {stat: 'configs'}).then(res => {
                assert.equal(res.data, fs.readFileSync('test/expected-data.html', 'utf8'));
            });
        });
    });
});

describe('plugins', () => {
    it('should be picked up automatically', () => {
        return template.run('{{loremIpsum}}').then(res => {
            assert.equal(res.data, 'Lorem ipsum dolor sit amet.');
        });
    });
});

describe('markdown', () => {

    it('should output data when no template is given', () => {
        return markdown.run(`
date: 2017-02-05
text: Some text
---
This is content. *bold*`, {text: 'overwritten'})
            .then(res => {
                assert.deepEqual(res.data, {
                    date: new Date(Date.UTC(2017, 1, 5)),
                    text: 'overwritten',
                    content: '<p>This is content. <em>bold</em></p>\n'
                });
            });
    });

    it('should output a string when a template is given', () => {
        configs.add({stat: 'configs', date: '1970-01-01'});
        return markdown.run(`
template: stat:{{stat}} - date:{{formatDate date 'DD.MM.YYYY'}} - text:{{text}} - {{{content}}} 
date: 2017-02-05
text: Some text
---
This is content. *bold*`, {text: 'overwritten'})
            .then(res => {
                assert.equal(res.data, 'stat:configs - date:05.02.2017 - text:overwritten - <p>This is content. <em>bold</em></p>\n');
            });
    });

    describe('!include', () => {
        it('includes text files', () => {
            return markdown.run('inner: !include test/inc.txt\n---\n', {}).then(res => {
                assert.deepEqual(res.data, {inner: 'hula\nhop', content: ''});
            });
        });
        it('includes and parses yaml files', () => {
            return markdown.run('inner: !include test/inc.yaml\n---\n', {}).then(res => {
                assert.deepEqual(res.data, {
                    inner: {text: 'include', date: new Date(Date.UTC(2017, 10, 4))},
                    content: ''
                });
            });
        });
    });
});

describe('processors', () => {
    it('should include markdown, template and copy', () => {
        fse.removeSync('test-out');
        configs.add({
            outputDir: 'test-out',
            exclude: ['test-out/**', 'coverage/**', 'src/**', 'README.md'],
            text: 'txt',
            date: new Date(2017, 9, 8),
            content: 'c'
        });
        return procs.run().then(() => {
            assertFileEqual('test-out/test/data.html', 'test/expected-data.html');
            assertFileEqual('test-out/test/template.html', 'test/expected-file.html');
            assert.ok(fs.existsSync('test-out/package.json'));
        });
    });
});

function assertFileEqual(actual, expected) {
    assert.equal(fs.readFileSync(actual, 'utf8'), fs.readFileSync(expected, 'utf8'));
}
