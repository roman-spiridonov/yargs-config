Configuration object wrapper for nested configs with yargs integration.

Features:
* Nested configs
* Deep merge of config objects
* Easy yargs initialization directly from config object
* Plays nicely with [nconf](https://github.com/indexzero/nconf) (see recipe below)

# Usage

`yargs-config` is itself a configuration object. All your current settings are stored in it.
It keeps track of default options for you as well.

## Initialize with your default settings
Notice the structure of `meta` object. It is used to populate `yargs` configuration.

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
            type: 'number'
        },
        nested: {
            nestedOption: {
                desc: 'This is nested option',
                type: 'string'
            }
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
