'use strict';
const template = require('../src/template');

template.registerHelper('loremIpsum', () => {
    return 'Lorem ipsum dolor sit amet.';
});