[![Build Status](https://travis-ci.org/roman-spiridonov/yargs-config.svg?branch=master)](https://travis-ci.org/roman-spiridonov/yargs-config)

Configuration object wrapper for nested configs with yargs integration.
Extends [nested-config](https://github.com/roman-spiridonov/nested-config) with `runCmd` function.

# JSDoc
API docs are available on the [wiki](../../wiki).

# Usage

`yargs-config` is itself a configuration object. All your current settings are stored in it.
It keeps track of default options for you as well.

## Initialize with your default settings
Create new config object using **create(overrides _[object]_, defaults _[object]_)**.

```javascript
const yc = require('yargs-config');

let defaults = {
    yourOption: 1,
    nested: {
        option: "two"
    },
    meta: {
        yourOption: 'This is my option',
        nested: {
            option: 'This is my nested option'
        }
    }
};

let config = yc.create({}, defaults);
```

Notice the structure of `meta` object. It is used to populate `yargs` configuration.
You can use either short form and provide just the description as shown above, or you can provide full meta object.

```javascript
// ...
meta: {
    yourOption: {
        desc: 'This is my option',
        alias: 'y'
        // default: 1,     // will be filled automatically anyway
        // type: 'number'  // will be filled automatically anyway
    }
    // ...
}
```

`default` and `type` will be determined automatically, so no need to fill them out explicitly.
Note that if config property is not inside `meta` object, it will not be exposed through yargs.

## Update current settings
```javascript
let overrides = {
    yourOption: 2,
    nested: {
        option: "three",
    },
};

config.add(overrides, {});  // performs deep merge into current config state
```

## Access settings
```javascript
config.yourOption;  // 2
config.getDefault('yourOption');  // 1
config.nested.option;  // "three"
config.getDefault('nested.option');  // "two"
```

## Run yargs
**runFromCmd(propStr [_string_], callback)**

Starts command-line application with yargs, supporting piped inputs.
* `propStr` - where to look for settings in case of nested config (e.g. consider propStr as the root). Leave empty for using whole object.
* `callback` - calls when done with (err, data, argv), where `data` is stdin and `argv` is parsed yargs argv object.

```javascript
if (!module.parent) {
  // Running from CLI
  config.runFromCmd('', (err, data, argv) => {
    // err is null if ok
    console.log(`This is input: ${data}`);
    console.log(`These are passed settings: ${argv}`);
  });
  
} else {
  // Using as a module
  module.exports = ...;
}
```

Now your application `app.js` can be launched from CLI as follows:
```bash
$ echo "your input" | app.js --yourOption 5 --nested.option "five"
$ app.js "your input" --yourOption 5 --nested.option "five"
```

