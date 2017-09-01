/**
 * Created by Roman Spiridonov <romars@phystech.edu> on 5/6/2017.
 */
"use strict";

const helpers = require('./helpers');


/**
 * Provides helper functions and meta descriptions for embedded configs.
 * @param config {object} - current configuration (leave empty {} if you want all current values to equal defaults)
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
 * @param config {object} - current config values to add
 * @param defaults {object} - default config values to add (leave empty {} if you do not want to change default values)
 * @param [options] {object}
 * @param [options.arrayBehavior] {number} - a flag identifying behavior of deep merge for arrays:
 * 0 (default) - replace with copy, 1 - append (push), 2 - replace with link (will mutate source).
 * @param [options.skipFunc] {function} - function that gets current target and source properties and returns true if this copy operation should be skipped.
 * Note that target property can be undefined if it is a new property for target.
 * @returns {Config} resulting config (reference to this)
 * @memberOf Config
 */
_p.add = function (config, defaults = {}, options) {
    if(options && options.mutate === false) delete options.mutate;  // we always need to mutate this in next step
    helpers.mergeDeep(this, defaults, config, options || {});
    helpers.mergeDeep(this._defaults, defaults, options || {});

    return this;
};

/**
 * Get the default value of a property in a format like "formula.output".
 * @param {string} propStr - Reference to a property as a "." delimited string
 * @returns {*} value of the property or undefined
 * @memberOf Config
 */
_p.getDefault = function (propStr) {
    return this._getPropRef(propStr, this._defaults);
};

/**
 * Parse meta information for a config property in a format like "formula.output" and return its ref.
 * @private
 * @memberOf Config
 */
_p._getMeta = function (propStr, target = this) {
    // add defaults values from config to yargs meta
    let meta = this._getPropRef(propStr, target.meta);
    let config = this.getDefault(propStr);

    // convert all props to the form of { default: ..., type: ... }
    config = this._normalizeMeta(config, false);
    meta = this._normalizeMeta(meta, true);

    helpers.mergeDeep(config, meta);

    return config;
};


/**
 * Plainifies meta object and wraps values into { default: ... }.
 * @param config {object} object containing nested meta objects to normalize
 * @param [populateDesc] {boolean} if true, populates description instead of default field of meta object (false by default)
 * @private
 * @memberOf Config
 */
_p._normalizeMeta = function (config, populateDesc = false) {
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
            res[key] = {[populateDesc ? 'desc' : 'default']: res[key], type: type};
        }
    }

    return res;
};


/**
 * Get the meta object in a format suitable for usage() function of yargs library.
 * @param {string[]} propStr - property object reference.
 * @returns {object}
 * @memberOf Config
 */
_p.getMetaYargsObj = function (propStr) {
    return this._getMeta(propStr);
};

/**
 * Parse config property in a format like "formula.output" and return prop ref.
 * @param {string} propStr - Reference to a property as a "." delimited string
 * @param {Object} target - Object to look at
 * @private
 * @memberOf Config
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
 * Starts command-line application with yargs, supporting piped inputs.
 * @param propStr {string} - where to look for settings (e.g. inside 'formula' property); leave empty to use whole config
 * @param cb {Config~runFromCmdCallback} - calls when done
 * @memberOf Config
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
            // require input string as a first parameter
            argv = argv.demandCommand(1);
        }

        argv = argv
        .usage("Usage: $0 \"<your input>\" [options]", self.getMetaYargsObj(propStr))
        .example("$0 \"your input\" [options]")
        .example("echo \"your input\" | $0 [options]")
        .help('h').alias('h', 'help')
          .argv
        ;

        /**
         * @callback Config~runFromCmdCallback
         * @param {Error|null} err - returns error as a first argument in case it occurred, null if everything was ok
         * @param {string} data - input data for a script
         * @param {object} argv - yargs object (add app-specific instructions)
         */
        cb(null, data || argv._[0], argv);
    }

};

exports.Config = Config;
