[![Build Status](https://travis-ci.org/roman-spiridonov/yargs-config.svg?branch=master)](https://travis-ci.org/roman-spiridonov/yargs-config)

Configuration object wrapper for nested configs with yargs integration.

Features:
* Nested configs
* Deep merge of config objects
* Easy yargs initialization directly from config object
* Plays nicely with [nconf](https://github.com/indexzero/nconf) (see recipe below)

# JSDoc
API docs are available on the [wiki](../../wiki).

# Usage

`yargs-config` is itself a configuration object. All your current settings are stored in it.
It keeps track of default options for you as well.

## Initialize with your default settings
Notice the structure of `meta` object. It is used to populate `yargs` configuration.

No need to explicitly fill out `type` and `default` fields of `meta` object as 
the library can automatically populate them for you. Also, you can enter just the description for a property `meta` object.

If config property is not inside `meta` object, it will not be used in yargs.

```javascript
const Config = require('yargs-config').Config;

let defaults = {
    yourOption: 1,
    nested: {
        nestedOption: "two"
    },
    meta: {
        yourOption: {
            desc: 'This is my option',
            alias: 'y'
            // type: 'number'  // can be populated automatically
            // default: 1  // can be populated automatically
        },
        nested: {
            nestedOption: 'You can just enter the description'
        }
    }
};

let config = new Config({}, defaults);
```

## Update current settings
```javascript
let overrides = {
    yourOption: 2,
    nested: {
        nestedOption: "three",
    },
};

config.add(overrides, {});  // performs deep merge into current config state
```

## Access settings
```javascript
config.yourOption;  // 2
config.getDefault('yourOption');  // 1
config.nested.nestedOption;  // "three"
config.getDefault('nested.nestedOption');  // "two"
```

## Run yargs
runFromCmd(propStr [_string_], callback)

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


## Use nconf (if needed)
Prepare `nconf` wrapper:
```javascript
const nconf = require('nconf');
const Config = require('./config').Config;

let defaultConfig = new Config({}, {some: "config"});

nconf
  .env()
  .argv()
  .defaults(defaultConfig);

// exports your current config
module.exports.nconf = nconf;  

// manipulate default config (e.g. add new options for embedded modules)
module.exports.defaults = defaultConfig;  
```
