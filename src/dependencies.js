'use strict';

const ls = require('./local-store');
const fs = require('fs');

let deps = {};
let sorted;

module.exports = {
    run: run,
    deps: deps,
    sort:sort,
    filter: filter,
    orderedDeps: orderedDeps
};

function run(file, promise) {
    for (let f in deps) {
        delete deps[f][file];
        delete deps[f]._mark;
    }
    ls.set(file);
    return promise();
}

const rfs = fs.readFileSync;
const rf = fs.readFile;
fs.readFileSync = function () {
    accessed(arguments[0]);
    return rfs.apply(null, arguments);
};
fs.readFile = function () {
    accessed(arguments[0]);
    return rf.apply(null, arguments);
};

function accessed(file) {
    let ctx = ls.get();
    if (ctx && ctx !== file) {
        if (!deps[file]) {
            deps[file] = {};
        }
        deps[file][ctx] = true;
    }
}

function sort() {
    sorted = [];
    let found;
    do {
        found = false;
        for (let d in deps) {
            if (deps[d]._mark !== 'perm') {
                visit(d);
                found = true;
                break;
            }
        }
    } while (found);
    return sorted;
}

function visit(d) {
    let n = deps[d];
    if (!n) {
        n = deps[d] = {};
    }
    if (n._mark === 'temp') {
        throw new Error('Circular dependencies');
    }
    if (!n._mark) {
        n._mark = 'temp';
        for (let e in n) {
            if (e !== '_mark') {
                visit(e);
            }
        }
        n._mark = 'perm';
        sorted.unshift(d);
    }
}
function filter(file) {
    let res = {};
    doFilter(file, res);
    return res;
}

function doFilter(file, res) {
    if (!res[file]) {
        res[file] = true;
        for (let d in deps[file]) {
            if (d !== '_mark') {
                doFilter(d, res);
            }
        }
    }
}

function orderedDeps(file) {
    let fs = filter(file);
    return sorted.filter(f => fs[f]);
}