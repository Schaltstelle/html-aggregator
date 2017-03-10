'use strict';

let args;

module.exports = {
    parseOrSet: function (config) {
        if (config) {
            args = config;
        } else {
            args = {opts: {}, args: []};
            for (let i = 3; i < process.argv.length; i++) {
                let arg = process.argv[i];
                if (arg.substring(0, 2) === '--') {
                    let parts = arg.split('=');
                    args.opts[parts[0].substring(2)] = (parts.length === 2) ? parts[1] : null;
                } else {
                    args.args.push(arg);
                }
            }
            args.opts.outputDir = args.opts.outputDir || 'output';
            args.opts.configDir = args.opts.configDir || '_aggregator';
            args.opts.parserDir = args.opts.configDir + '/parsers';
            args.opts.cacheDir = args.opts.configDir + '/cache';
        }
        return args;
    },
    args: args
};
