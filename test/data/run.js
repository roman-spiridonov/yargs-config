/**
 * Created by Roman Spiridonov <romars@phystech.edu> on 9/1/2017.
 */
const Config = require('../../config').Config;

let config = new Config({}, {
    num: 1,
    nested: {
        arr: [1, 2]
    },
    meta: {
        num: "Number description",
        nested: {
            arr: "Array description"
        }
    }
});

config.runFromCmd('', function(err, data, argv) {
    console.log(`${data} ${argv.num} ${argv.nested.arr[0]},${argv.nested.arr[1]}`);
});
