'use strict';
const promBars = require('promised-handlebars');
const handlebars = promBars(require('handlebars'));

module.exports = {
    registerHelper(name, func){
        handlebars.registerHelper(name, func);
    },

    run: function (input, data) {
        try {
            return handlebars.compile(input)(data).then(res => ({data: res}));
        } catch (e) {
            return Promise.reject(e);
        }
    }
};

