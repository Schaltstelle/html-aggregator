"use strict";

process.env.DEBUG = '*';

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

describe('template', () => {
    describe('string', () => {
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
        it('should remove link', () => {
            return template.run('x{{noLinks "a<a>nix</a>-<a href=\'hula\'>hula</a>"}}y', {}).then(res => {
                assert.equal(res.data, 'xanix-hulay');
            })
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
    describe('run', () => {
        it('should have data priority: parameter > md file > configs', () => {
            configs.add({stat: 'configs', date: '1970-01-01'});
            return markdown.run(fs.readFileSync('test/data.md', 'utf8'), {text: 'overwritten'}).then(res => {
                assert.equal(res.data, 'text:overwritten\ndate:03.02.2017\nstat:configs\n<p>This is content. <em>bold</em></p>\n');
            });
        });
    });
});

describe.only('processors', () => {
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
            // assertFileEqual('test-out/test/data.html', 'test/expected-data.html');
            // assertFileEqual('test-out/test/template.html', 'test/expected-file.html');
            // assert.ok(fs.existsSync('test-out/package.json'));
        });
    });
});

function assertFileEqual(actual, expected) {
    assert.equal(fs.readFileSync(actual, 'utf8'), fs.readFileSync(expected, 'utf8'));
}
