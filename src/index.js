'use strict'

const configs = require('./configs')
const template = require('./template')
const markdown = require('./markdown')
const yaml = require('./yaml')
const procs = require('./processors')

module.exports = {
    init: function (config) {
        configs.add(config)
        return require('./plugins')
    },
    configs: configs.args,
    addConfig: chaining(configs.add),
    template: template.run,
    markdown: markdown.run,
    loadMarkdown: markdown.load,
    loadYaml: yaml.load,
    loadYamlSync: yaml.loadSync,
    run: procs.run,
    processorsFor: procs.processorsFor,
    registerHelper: chaining(template.registerHelper),
    registerProcessor: chaining(procs.registerProcessor),
    registerTag: chaining(yaml.registerTag),
    pipeline: procs.pipeline
}

function chaining(func) {
    return function () {
        func.apply(null, arguments)
        return module.exports
    }
}
