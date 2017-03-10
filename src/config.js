'use strict';

let args = {opts: {}, args: []};
for (let i = 3; i < process.argv.length; i++) {
    let arg = process.argv[i];
    if (arg.substring(0, 2) === '--') {
        let parts = arg.split('=');
        args.opts[parts[0].substring(2)] = (parts.length === 2) ? parts[1] : null;
    } else {
        args.args.push(arg);
    }
}

module.exports = {
    args: function () {
        return args.args;
    },

    outputDir: function () {
        return args.opts.outputDir || 'output';
    },

    configDir: function () {
        return configDir();
    },

    parserDir: function () {
        return configDir() + '/parsers';
    },

    cacheDir: function () {
        return configDir() + '/cache';
    },
};

function configDir() {
    return args.opts.configDir || '_aggregator';
}
