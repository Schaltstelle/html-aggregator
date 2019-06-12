'use strict'
const promBars = require('promised-handlebars')
const handlebars = promBars(require('handlebars'))
const configs = require('./configs')

module.exports = {
    registerHelper(name, func) {
        handlebars.registerHelper(name, func)
    },

    run: function (input, data) {
        try {
            let res = handlebars.compile(input)(Object.assign({}, configs.args, data))
            return (res.then ? res : Promise.resolve(res)).then(res => ({data: res}))
        } catch (e) {
            return Promise.reject(e)
        }
    }
}

