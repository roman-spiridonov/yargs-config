/**
 * Created by Roman Spiridonov <romars@phystech.edu> on 8/23/2017.
 */
"use strict";

const
    nc = require('nested-config'),
    ConfigYargs = require('./config').ConfigYargs;


exports.ConfigYargs = ConfigYargs;
exports.create = function(overrides, defaults) {
    return new ConfigYargs(overrides, defaults);
};
exports.mergeDeep = nc.mergeDeep;
exports.plainify = nc.plainify;
