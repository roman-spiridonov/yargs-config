/**
 * Created by Roman Spiridonov <romars@phystech.edu> on 5/6/2017.
 */
"use strict";

const
    util = require('util'),
    nc = require('nested-config'),
    Config = nc.Config;

/**
 * Provides helper functions and meta descriptions for embedded configs.
 * @param config {object} - current configuration (leave empty {} if you want all current values to equal defaults)
 * @param defaults {object} - default configuration
 * @constructor
 */
function ConfigYargs(config, defaults) {
    Config.apply(this, arguments);
}

util.inherits(ConfigYargs, Config);
ConfigYargs.prototype.constructor = ConfigYargs;

/**
 * Parse meta information for a config property in a format like "formula.output" and return its ref.
 * @private
 */
ConfigYargs.prototype._getMeta = function (propStr, target = this) {
    // add defaults values from config to yargs meta
    let meta = this.getPropRef(propStr, target.meta);
    let config = this.getDefault(propStr);

    // convert all props to the form of { default: ..., type: ... }
    config = this._normalizeMeta(config, false);
    meta = this._normalizeMeta(meta, true);

    nc.mergeDeep(config, meta);

    return config;
};


/**
 * Plainifies meta object and wraps values into { default: ... }.
 * @param config {object} object containing nested meta objects to normalize
 * @param [populateDesc] {boolean} if true, populates description instead of default field of meta object (false by default)
 * @private
 */
ConfigYargs.prototype._normalizeMeta = function (config, populateDesc = false) {
    function _isMetaProp(prop) {
        return !!(prop.type);
    }

    delete config.meta;

    // make plain object, do not plainify already prepared meta props
    let res = nc.plainify(config, _isMetaProp);

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
            if(populateDesc && type === 'string') delete res[key].type;  // type is misleading in this case
        }
    }

    return res;
};


/**
 * Get the meta object in a format suitable for usage() function of yargs library.
 * @param {string[]} propStr - property object reference.
 * @returns {object}
 */
ConfigYargs.prototype.getMetaYargsObj = function (propStr) {
    return this._getMeta(propStr);
};

/**
 * Starts command-line application with yargs, supporting piped inputs.
 * @param propStr {string} - where to look for settings (e.g. inside 'formula' property); leave empty to use whole config
 * @param cb {ConfigYargs~RunFromCmdCallback} - calls when done
 */
ConfigYargs.prototype.runFromCmd = function (propStr, cb) {
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
        .usage("Usage: $0 <your input> [options]\nOr: echo <your input> | $0 [options]",
          self.getMetaYargsObj(propStr))
        .help('h').alias('h', 'help')
        .argv
        ;

        /**
         * @callback ConfigYargs~RunFromCmdCallback
         * @property {Error|null} err - returns error as a first argument in case it occurred, null if everything was ok
         * @property {string} data - input data for a script
         * @property {object} argv - yargs object (add app-specific instructions)
         */
        cb(null, data || argv._[0], argv);
    }
};

exports.ConfigYargs = ConfigYargs;
