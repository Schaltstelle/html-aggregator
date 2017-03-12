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
            return template.string('x{{var}}y', {var: 42}).then(res => {
                assert.equal(res, 'x42y');
            });
        });
        it('should format dates', () => {
            return template.string('x{{formatDate var "DD.MM.YYYY"}}y', {var: new Date(2017, 2, 3)}).then(res => {
                assert.equal(res, 'x03.03.2017y');
            });
        });
        it('should remove newlines', () => {
            return template.string('x{{noNewlines "a\nb\rc\r\nd"}}y', {}).then(res => {
                assert.equal(res, 'xa b c  dy');
            });
        });
        it('should remove link', () => {
            return template.string('x{{noLinks "a<a>nix</a>-<a href=\'hula\'>hula</a>"}}y', {}).then(res => {
                assert.equal(res, 'xanix-hulay');
            })
        });
    });

    describe('file', () => {
        it('should work on file', () => {
            return template.file('test', 'template.html', {
                text: 'txt',
                date: new Date(2017, 9, 8),
                content: 'c'
            }, 'test-out').then(() => {
                assertFileEqual('test-out/template.html', 'test/expected-file.html');
            });
        });
    });
});

describe('plugins', () => {
    it('should be picked up automatically', () => {
        return template.string('{{loremIpsum}}').then(res => {
            assert.equal(res, 'Lorem ipsum dolor sit amet.');
        });
    });
});

describe('markdown', () => {
    describe('run', () => {
        it('should run', () => {
            return markdown.run('', 'test/data.md', 'test-out').then(() => {
                assertFileEqual('test-out/test/data.html', 'test/expected-data.html');
            });
        });
    });
});

describe('processors', () => {
    it('should include markdown, template and copy', () => {
        fse.removeSync('test-out/proc');
        configs.add({
            outputDir: 'test-out/proc',
            exclude: ['test-out/**', 'coverage/**', 'src/**', 'README.md'],
            text: 'txt',
            date: new Date(2017, 9, 8),
            content: 'c'
        });
        return procs.run().then(() => {
            assertFileEqual('test-out/proc/test/data.html', 'test/expected-data.html');
            assertFileEqual('test-out/proc/test/template.html', 'test/expected-file.html');
            assert.ok(fs.existsSync('test-out/proc/package.json'));
        });
    });
});

function assertFileEqual(actual, expected) {
    assert.equal(fs.readFileSync(actual, 'utf8'), fs.readFileSync(expected, 'utf8'));
}
