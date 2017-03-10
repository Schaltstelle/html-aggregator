"use strict";

const assert = require('assert');
const fs = require('fs');
const fse = require('fs-extra');
const index = require('../src/index');
const markdown = require('../src/markdown');
const aggregate = require('../src/aggregate');
const configs = require('../src/configs');

describe('markdown', () => {
    describe('template', () => {
        it('should replace simple variables', () => {
            return markdown.template('x{{var}}y', {var: 42}).then(res => {
                assert.equal(res, 'x42y');
            });
        });
        it('should format dates', () => {
            return markdown.template('x{{formatDate var "DD.MM.YYYY"}}y', {var: new Date(2017, 2, 3)}).then(res => {
                assert.equal(res, 'x03.03.2017y');
            });
        });
        it('should remove newlines', () => {
            return markdown.template('x{{noNewlines "a\nb\rc\r\nd"}}y', {}).then(res => {
                assert.equal(res, 'xa b c  dy');
            });
        });
        it('should remove link', () => {
            return markdown.template('x{{noLinks "a<a>nix</a>-<a href=\'hula\'>hula</a>"}}y', {}).then(res => {
                assert.equal(res, 'xanix-hulay');
            })
        });
    });

    describe('run', () => {
        it('should run', () => {
            return markdown.run({args: ['test'], outputDir: 'test-out', configDir: 'test'}).then(() => {
                assertFileEqual('test-out/data.html', 'test/expected-data.html');
            });
        });
    });
});

describe('aggregate', () => {
    it('should gather data from file', () => {
        configs.parseOrSet({});
        fse.removeSync('test/cache');
        return aggregate.run('test/agg-input.html', 'file', 'test/agg-template.html').then(res => {
            assert.equal(res, fs.readFileSync('test/expected-file-agg.html', 'utf8'));
        });
    });
    it('should gather data from url', () => {
        configs.parseOrSet({});
        fse.removeSync('test/cache');
        return aggregate.run('http://en.wikipedia.org', 'wikipedia', 'test/agg-template.html').then(res => {
            assert.equal(res, fs.readFileSync('test/expected-url-agg.html', 'utf8'));
        });
    });
    it('should work as a helper', () => {
        configs.parseOrSet({});
        fse.removeSync('test/cache');
        return markdown.template('{{{aggregate "test/agg-input.html" "file" "test/agg-template.html"}}}',{}).then(res => {
            assert.equal(res, fs.readFileSync('test/expected-file-agg.html', 'utf8'));
        });
    });
});

function assertFileEqual(actual, expected) {
    assert.equal(fs.readFileSync(actual, 'utf8'), fs.readFileSync(expected, 'utf8'));
}