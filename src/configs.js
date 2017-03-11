'use strict';

let args = {args: []};

module.exports = {
    parseOrSet: function (config) {
        if (config) {
            Object.assign(args, config);
        } else {
            let start = endsWith(process.argv[1], '_mocha') ? 2 : 3;
            for (let i = start; i < process.argv.length; i++) {
                let arg = process.argv[i];
                if (arg.substring(0, 2) === '--') {
                    let parts = arg.split('=');
                    args[parts[0].substring(2)] = (parts.length === 2) ? parts[1] : true;
                } else {
                    args.args.push(arg);
                }
            }
        }
        args.outputDir = args.outputDir || 'output';
        args.configDir = args.configDir || '_aggregator';
        args.parserDir = args.configDir + '/parsers';
        args.cacheDir = args.configDir + '/cache';
        args.pluginDir = args.configDir + '/plugins';
        args.exclude = Array.isArray(args.exclude) ? args.exclude : (args.exclude || '').split(',');
        return args;
    },
    args: args
};

function endsWith(s, end) {
    return s.substring(s.length - end.length) === end;
}
