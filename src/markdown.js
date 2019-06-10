'use strict'
const marked = require('marked')
const path = require('path')
const fs = require('fs')
const yaml = require('./yaml')
const template = require('./template')

module.exports = {
    run: run
}

function run(input, data) {
    let split = /^---\s*$/m.exec(input)
    let parts = (split === null)
        ? [input, '']
        : [input.substring(0, split.index), input.substring(split.index + split[0].length)]
    return yaml.load(parts[0]).then(y => {
        let fullData = Object.assign({}, y, data)
        fullData.content = marked(parts[1])
        let templ = findTemplate(fullData)
        return templ
            ? template.run(templ.text, fullData).then(res => {
                return {data: res.data, path: fullData.path, ext: templ.ext}
            })
            : {data: fullData, path: fullData.path, ext: '.html'}
    })
}

function findTemplate(data) {
    if (data.template) {
        return {text: data.template, ext: '.html'} //TODO a way to find out extname of !include?
    }
    if (data.templateFile) {
        return {text: fs.readFileSync(data.templateFile, 'utf8'), ext: path.extname(data.templateFile)}
    }
}