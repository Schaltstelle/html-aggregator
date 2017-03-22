'use strict';

if (!process.addAsyncListener) {
    require('async-listener');
}

let active = null;
let list = [];

module.exports = {
    set: value => active = value,
    get: () => active
};

process.addAsyncListener({
    create: value => active,
    before: (ctx, storage) => {
        list.push(active);
        active = storage;
    },
    after: (ctx, storage) => close(storage),
    error: (storage, err) => close(storage)
});

function close(storage) {
    if (storage === active) {
        active = list.pop();
        return;
    }
    let index = list.lastIndexOf(storage);
    if (index < 0) {
        console.log(active, storage, list);
        console.log('ERROR: Storage value ' + storage + ' not listed.');
    }
    list.splice(index, 1);
}