"use strict";

const assert = require('assert');
const fs = require('fs');
const index = require('../src/index');
const markdown = require('../src/markdown');

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
            return markdown.run({args: ['test'], opts: {outputDir: 'test-out', configDir: 'test'}}).then(() => {
                assert.equal(fs.readFileSync('test-out/data.html', 'utf8'), fs.readFileSync('test/expected-data.html', 'utf8'));
            });
        });
    });
});
