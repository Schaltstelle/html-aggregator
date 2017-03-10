"use strict";

const assert = require('assert');
const markdown = require('../src/markdown');

describe('markdown', () => {
    describe('template', () => {
        it('should replace simple variables', () => {
            return markdown.template('x{{var}}y', {var: 42}).then(res => {
                assert.equal(res, 'x42y');
            })
        });
    });
});