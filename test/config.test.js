/**
 * Created by Roman Spiridonov <romars@phystech.edu> on 5/6/2017.
 */
"use strict";

const
  // Libraries
  expect = require('chai').expect,
  sinon = require('sinon');

let
  // Project modules
  yc = require('../index');

describe("Config", function() {
    let overrides = {};

    let defaults = {
        foo: 'bar',
        nested: {
            nested: {
                foo: 'bar',
                array: [1, 2]
            },
            foo: 'bar'
        },

        meta: {
            foo: {desc: 'Some description', type: 'string', alias: 'f'},
            nested: {
                foo: {desc: 'Some description', type: 'string'},
                nested: {
                    foo: 'Some description',
                    array: {desc: 'Some description', type: 'array', alias: 'a'}
                }
            }
        }
    };

    describe("Construction and initialization", function() {
        it("creates new config properly using constructor", function() {
            let config = yc.create(
              {
                  port: 8080,
                  formula: {
                      delims: ["<math>"],
                      output: "mml"
                  }
              },
              {
                  port: 8000,
                  delims: ["\\$\\$"],
                  formula: {
                      input: "TeX"
                  }
              });
            expect(config.port).to.equal(8080);
            expect(config._defaults.port).to.equal(8000);
            expect(config).to.have.property('formula').that.is.an('object');
            expect(config.formula.input).to.equal("TeX");
            expect(config.formula.output).to.equal("mml");
            expect(config.formula).to.have.property('delims').that.is.an('array')
            .that.deep.equals(["<math>"]);
        });
    });

    describe("add", function() {
        it("deeply extends config object with new options, overriding old values with new ones", function() {
            it("creates new config properly", function() {
                let config = yc.create({}, defaults);
                config.add(overrides);

                expect(config.port).to.equal(8080);
                expect(config._defaults.port).to.equal(8000);
                expect(config).to.have.property('formula').that.is.an('object').that.deep.equals({
                    input: "TeX",
                    output: "mml",
                    delims: ["<math>"]
                });
            });
        });

        it("supports merge options", function() {
            let config = yc.create({}, defaults);
            config.add({nested: {nested: {array: [3]}}}, {}, {arrayBehavior: 1});
            expect(config.nested.nested.array).to.eql([1, 2, 3]);
        });
    });

    describe("getPropRef", function() {
        it("returns target if the first parameter is null or empty string", function() {
            let config = yc.create(overrides, defaults);
            expect(config.getPropRef(null)).to.equal(config);
            expect(config.getPropRef('')).to.equal(config);
            let obj = {test: 'this'};
            expect(config.getPropRef('', obj)).to.equal(obj);
        });

        it("returns correct property based on reference string", function() {
            let config = yc.create(overrides, defaults);
            expect(config.getPropRef('nested.foo')).to.equal('bar');
            expect(config.getPropRef('nested', config.meta)).to.be.an('object')
            .that.eql(defaults.meta.nested);
            expect(config.getPropRef('nested.nested.array', config.meta)).to.eql(defaults.meta.nested.nested.array);
        });
    });

    describe("getMetaYargsObj", function() {
        it("returns part of meta object with parameter descriptions for yargs.usage options", function() {
            let config = yc.create(overrides, defaults);
            expect(config.getMetaYargsObj()).to.eql({
                foo: {desc: 'Some description', type: 'string', alias: 'f', default: 'bar'},
                'nested.foo': {desc: 'Some description', type: 'string', default: 'bar'},
                'nested.nested.foo': {desc: 'Some description', type: 'string', default: 'bar'},
                'nested.nested.array': {desc: 'Some description', type: 'array', alias: 'a', default: [1, 2]}
            });
        });

        it("automatically fills in the type and default value of the property", function() {
            let defaultsTest = {
                str: 'string',
                num: 100,
                arr: [1, 2],
                bool: true,
                nested: {
                    val11: null,
                    val12: null,
                    val21: undefined,
                    val22: undefined,
                    val3: i => i + 1
                },
                meta: {
                    nested: {
                        val12: {
                            default: '',
                            type: 'string'
                        },
                        val22: {
                            default: '',
                            type: 'string'
                        }
                    }
                }
            };
            let config = yc.create({}, defaultsTest);

            expect(config.getMetaYargsObj()).to.eql({
                str: {
                    default: 'string',
                    type: "string"
                },
                num: {
                    default: 100,
                    type: "number"
                },
                arr: {
                    default: [1, 2],
                    type: "array"
                },
                bool: {
                    default: true,
                    type: "boolean"
                },
                'nested.val12': {
                    default: '',
                    type: 'string'
                },
                'nested.val22': {
                    default: '',
                    type: 'string'
                }
            });
        });

        it("supports short descriptions in meta", function() {
            let defaultsTest = {
                arr: [1, 2],
                meta: {
                    arr: 'Some description'
                }
            };

            let config = yc.create({}, defaultsTest);

            expect(config.getMetaYargsObj()).to.eql({
                arr: {
                    desc: 'Some description',
                    type: 'array',
                    default: [1, 2]
                }
            });

        });
    });

    describe("_normalizeMeta", function() {
        it("wraps plain object keys in { default: ... }", function() {
            let testObj = {foo: 'bar', someKey: true, someArray: [1, 2]};
            let res = yc.ConfigYargs.prototype._normalizeMeta(testObj);
            expect(res).to.eql({
                foo: {default: 'bar', type: 'string'}, someKey: {default: true, type: 'boolean'},
                someArray: {default: [1, 2], type: 'array'}
            });
            expect(res).to.not.equal(testObj);
        });

        it("does not mutate an object", function() {
            let testObj = {foo: 'bar', someKey: true, someArray: [1, 2]};
            yc.ConfigYargs.prototype._normalizeMeta(testObj);
            expect(testObj).to.eql({foo: 'bar', someKey: true, someArray: [1, 2]});
        });

        it("makes nested object a plain object with nested keys written as some.nested.key = { default: ... }", function() {
            let testObj = {nested: {foo: 'bar', nested: {foo: [1, 2]}}, foo: 'bar'};
            let res = yc.ConfigYargs.prototype._normalizeMeta(testObj);
            expect(res).to.eql({
                'nested.foo': {default: 'bar', type: 'string'},
                'nested.nested.foo': {default: [1, 2], type: 'array'},
                'foo': {default: 'bar', type: 'string'}
            });
        });

        it("plainifies meta object properly", function() {
            let testObj = defaults.meta;
            let res = yc.ConfigYargs.prototype._normalizeMeta(testObj, true);
            expect(res).to.eql({
                foo: {desc: 'Some description', type: 'string', alias: 'f'},
                'nested.foo': {desc: 'Some description', type: 'string'},
                'nested.nested.foo': {desc: 'Some description'},
                'nested.nested.array': {desc: 'Some description', type: 'array', alias: 'a'}
            });

        })
    });

    describe("Acceptance test", function() {
        it("works from cli with piped input", function(done) {
            const cp = require('child_process');
            cp.exec('cat test/data/input | node test/data/run.js --num 5 --nested.arr 5 6',
              function(error, stdout, stderr) {
                  expect(stdout).to.equal('data 5 5,6\n');
                  done();
              });
        });

        it("works from cli with first parameter input", function(done) {
            const cp = require('child_process');
            let p = cp.fork('test/data/run.js', ['data', '--num', '5', '--nested.arr', '5', '6'], {
                stdio: ['ignore', 'pipe', 'pipe', 'ipc']
            });
            p.stdout.on('data', function(stdout) {
                expect(stdout.toString()).to.equal('data 5 5,6\n');
                done();
            });
        });

        it("works from cli with first parameter input and recognizes defaults", function(done) {
            const cp = require('child_process');
            let p = cp.fork('test/data/run.js', ['data'], {
                stdio: ['ignore', 'pipe', 'pipe', 'ipc']
            });
            p.stdout.on('data', function(stdout) {
                expect(stdout.toString()).to.equal('data 1 1,2\n');
                done();
            });
        });

        it("returns correct usage description", function(done) {
            const cp = require('child_process');
            let p = cp.fork('test/data/run.js', ['-h'], {
                stdio: ['ignore', 'pipe', 'pipe', 'ipc']
            });
            p.stdout.on('data', function(stdout) {
                let res = stdout.toString();
                expect(res).to.match(/--num[\s\S]*\[number\] \[default: 1\]/);
                expect(res).to.match(/--nested\.arr[\s\S]*\[array\] \[default: \[1,2\]\]/);
                done();
            });
        });
    });

    describe("Bug fixes", function() {
        it("does not have side effects when mutating defaults", function() {
            const defaults = {array: [[1, 2]]};
            let config = yc.create(defaults, defaults);
            config.array.push([3]);
            expect(config.array).to.eql([[1, 2], [3]]);
            expect(config._defaults.array).to.eql([[1, 2]]);
        });
    });
});
