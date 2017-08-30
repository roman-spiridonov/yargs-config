/**
 * Created by Roman Spiridonov <romars@phystech.edu> on 5/6/2017.
 */
"use strict";

const helpers = require('./helpers');


/**
 * Provides helper functions and meta descriptions for embedded configs.
 * @param config {object} - current configuration
 * @param defaults {object} - default configuration
 * @constructor
 */
function Config(config, defaults) {
    this._defaults = {};
    this.add(config, defaults);
}

const _p = Config.prototype;

/**
 * Add more config options (overrides repeated ones).
 * @param config {object}
 * @param defaults {object}
 */
_p.add = function (config, defaults = {}) {
    helpers.mergeDeep(this, defaults, config);
    helpers.mergeDeep(this._defaults, defaults);
};

/**
 * Get the default value of a property in a format like "formula.output".
 */
_p.getDefault = function (propStr) {
    return this._getPropRef(propStr, this._defaults);
};

/**
 * Parse meta information for a config property in a format like "formula.output" and return its ref.
 */
_p._getMeta = function (propStr, target = this) {
    // add defaults values from config to yargs meta
    let meta = this._getPropRef(propStr, target.meta);
    let config = this.getDefault(propStr);

    // convert all props to the form of { default: ..., type: ... }
    config = this._normalizeMeta(config);
    meta = this._normalizeMeta(meta);

    helpers.mergeDeep(config, meta);

    return config;
};


/**
 * Plainifies meta object and wraps values into { default: ... }.
 *
 * @private
 */
_p._normalizeMeta = function (config) {
    function _isMetaProp(prop) {
        return !!(prop.type);
    }

    delete config.meta;

    // make plain object, do not plainify already prepared meta props
    let res = helpers.plainify(config, _isMetaProp);

    // determine default value and type
    for (let key of Object.keys(res)) {
        let type;
        if(typeof res[key] === 'string') {
            type = 'string';
        } else if(typeof res[key] === 'number') {
            type = 'number';
        } else if(typeof res[key] === 'boolean') {
            type = 'boolean';
        } else if(Array.isArray(res[key])) {
            type = 'array';
        } else if(typeof res[key] === 'function') {
            type = 'function';
        } else {
            type = undefined;
        }

        // if type is undefined, rely on user provided meta information
        if(res[key] === null || type === 'function') {
            delete res[key];
        } else if(type) {
            res[key] = {default: res[key], type: type};
        }
    }

    return res;
};


/**
 * Get the meta object in a format suitable for usage() function of yargs library.
 * @param {string[]} propStr - property object reference.
 */
_p.getMetaYargsObj = function (propStr) {
    return this._getMeta(propStr);
};

/**
 * Parse config property in a format like "formula.output" and return prop ref.
 * @param {string} propStr - Reference to a property as a "." delimited string
 * @param {Object} target - Object to look at
 */
_p._getPropRef = function (propStr, target = this) {
    if (!propStr || propStr === '') {
        return target;
    }

    let interimProps = propStr.split('.');
    let res = target;
    for (let i = 0; i < interimProps.length; i++) {
        let prop = interimProps[i];
        if (i === 0) {
            res = target[prop];
            continue;
        }
        res = res[prop];
    }

    return res;
};

/**
 * @callback Config~executeCallback
 * @param {Error|null} err - returns error as a first argument in case it occurred, null if everything was ok.
 * @param {string} data - input data for a script
 * @param {object} argv - yargs object (add app-specific instructions)
 */

/**
 * Starts command-line application with yargs, supporting piped inputs.
 * @param propStr {string} - where to look for settings (e.g. inside 'formula' property)
 * @param cb {Config~executeCallback} - calls when done
 */
_p.runFromCmd = function (propStr, cb) {
    let self = this;

    // Support piping
    let data = "";
    if (!process.stdin.isTTY) {  // running as <cmd> "#Heading"
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', function (chunk) {
            data += chunk;
        });
        process.stdin.on('end', () => {
            data = data.replace(/\n$/, ''); // replace trailing \n from hitting enter on stdin
            return execute(data);
        });

    } else {  // running as cat file.html | <cmd>
        return execute(null);
    }


    function execute(data) {
        let argv = require('yargs');
        if (!data) {
            // require formula string as a first parameter
            argv = argv.demandCommand(1);
        }

        argv = argv
        .usage("Usage: $0 \"<your input>\" [options]", self.getMetaYargsObj(propStr))
        .example("$0 \"your input\" [options]")
        .example("echo \"your input\" | $0 [options]")
        .help('h').alias('h', 'help')
          .argv
        ;

        cb(null, data || argv._[0], argv);
    }

};

exports.Config = Config;
