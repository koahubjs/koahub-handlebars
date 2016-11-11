'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var util = require('util');

/**
 * Shallow copy two objects into a new object
 *
 * Objects are merged from left to right. Thus, properties in objects further
 * to the right are preferred over those on the left.
 *
 * @param {object} obj1
 * @param {object} obj2
 * @returns {object}
 * @api private
 */

var merge = function merge(obj1, obj2) {
    var c = {};
    var keys = (0, _keys2.default)(obj2);
    for (var i = 0; i !== keys.length; i++) {
        c[keys[i]] = obj2[keys[i]];
    }

    keys = (0, _keys2.default)(obj1);
    for (i = 0; i !== keys.length; i++) {
        if (!c.hasOwnProperty(keys[i])) {
            c[keys[i]] = obj1[keys[i]];
        }
    }

    return c;
};

/* Capture the layout name; thanks express-hbs */
var rLayoutPattern = /{{!<\s+([A-Za-z0-9\._\-\/]+)\s*}}/;

/**
 * file reader returning a thunk
 * @param filename {String} Name of file to read
 */

var read = function read(filename) {
    return new _promise2.default(function (resolve, reject) {
        fs.readFile(filename, { encoding: 'utf8' }, function (err, data) {
            if (err) throw err;
            resolve(data);
        });
    });
};

/**
 * @class MissingTemplateError
 * @param {String} message The error message
 * @param {Object} extra   The value of the template, relating to the error.
 */
function MissingTemplateError(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};

util.inherits(MissingTemplateError, Error);

/**
 * @class BadOptionsError
 * @param {String} message The error message
 * @param {Object} extra   Misc infomration.
 */
function BadOptionsError(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};

util.inherits(BadOptionsError, Error);

/**
 * expose default instance of `Hbs`
 */

exports = module.exports = new Hbs();

/**
 * expose method to create additional instances of `Hbs`
 */

exports.create = function () {
    return new Hbs();
};

/**
 * Create new instance of `Hbs`
 *
 * @api public
 */

function Hbs() {
    if (!(this instanceof Hbs)) {
        return new Hbs();
    }

    this.handlebars = require('handlebars').create();

    this.Utils = this.handlebars.Utils;
    this.SafeString = this.handlebars.SafeString;
}

/**
 * Configure the instance.
 *
 * @api private
 */

Hbs.prototype.configure = function (options) {

    var self = this;

    if (!options.viewPath) {
        throw new BadOptionsError('The option `viewPath` must be specified.');
    }

    // Attach options
    options = options || {};
    this.viewPath = options.viewPath || '';
    this.handlebars = options.handlebars || this.handlebars;
    this.templateOptions = options.templateOptions || {};
    this.extname = options.extname || '.hbs';
    this.partialsPath = options.partialsPath || '';
    this.contentHelperName = options.contentHelperName || 'contentFor';
    this.blockHelperName = options.blockHelperName || 'block';
    this.defaultLayout = options.defaultLayout || '';
    this.layoutsPath = options.layoutsPath || '';
    this.locals = options.locals || {};
    this.disableCache = options.disableCache || false;
    this.partialsRegistered = false;

    // Cache templates and layouts
    this.cache = {};

    this.blocks = {};

    // block helper
    this.registerHelper(this.blockHelperName, function (name, options) {
        // instead of returning self.block(name), render the default content if no
        // block is given
        val = self.block(name);
        if (val === '' && typeof options.fn === 'function') {
            val = options.fn(this);
        }

        return val;
    });

    // contentFor helper
    this.registerHelper(this.contentHelperName, function (name, options) {
        return self.content(name, options, this);
    });

    return this;
};

/**
 * Middleware for koa
 *
 * @api public
 */

Hbs.prototype.middleware = function (options) {
    this.configure(options);

    var render = this.createRenderer();

    return function () {
        var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(ctx, next) {
            return _regenerator2.default.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            ctx.render = render;
                            _context.next = 3;
                            return next();

                        case 3:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this);
        }));

        return function (_x, _x2) {
            return _ref.apply(this, arguments);
        };
    }();
};

/**
 *
 * set theme
 */
Hbs.prototype.getTheme = function () {
    var theme = '';
    if (ctx.state.theme) {
        theme = ctx.state.theme + '/';
    }

    return theme;
};
/**
 * Create a render generator to be attached to koa context
 */

Hbs.prototype.createRenderer = function () {
    var hbs = this;

    return function () {
        var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(tpl, locals) {
            var theme, tplPath, template, rawTemplate, layoutTemplate, layout, rawLayout;
            return _regenerator2.default.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            theme = hbs.getTheme();
                            tplPath = hbs.getTemplatePath(theme + tpl);

                            if (tplPath) {
                                _context2.next = 4;
                                break;
                            }

                            throw new MissingTemplateError('The template specified does not exist.', tplPath);

                        case 4:

                            // allow absolute paths to be used
                            if (path.isAbsolute(tpl)) {
                                tplPath = tpl + hbs.extname;
                            }

                            locals = merge(ctx.state || {}, locals || {});
                            locals = merge(hbs.locals, locals);

                            // Initialization... move these actions into another function to remove
                            // unnecessary checks

                            if (!(hbs.disableCache || !hbs.partialsRegistered && hbs.partialsPath !== '')) {
                                _context2.next = 10;
                                break;
                            }

                            _context2.next = 10;
                            return hbs.registerPartials();

                        case 10:
                            if (!(hbs.disableCache || !hbs.cache[tpl])) {
                                _context2.next = 26;
                                break;
                            }

                            _context2.next = 13;
                            return read(tplPath);

                        case 13:
                            rawTemplate = _context2.sent;

                            hbs.cache[tpl] = {
                                template: hbs.handlebars.compile(rawTemplate)
                            };

                            // Load layout if specified

                            if (!(typeof locals.layout !== 'undefined' || rLayoutPattern.test(rawTemplate))) {
                                _context2.next = 26;
                                break;
                            }

                            layout = locals.layout;


                            if (typeof layout === 'undefined') {
                                layout = rLayoutPattern.exec(rawTemplate)[1];
                            }

                            if (!(layout !== false)) {
                                _context2.next = 25;
                                break;
                            }

                            _context2.next = 21;
                            return hbs.loadLayoutFile(layout);

                        case 21:
                            rawLayout = _context2.sent;

                            hbs.cache[tpl].layoutTemplate = hbs.handlebars.compile(rawLayout);
                            _context2.next = 26;
                            break;

                        case 25:
                            hbs.cache[tpl].layoutTemplate = hbs.handlebars.compile('{{{body}}}');

                        case 26:

                            template = hbs.cache[tpl].template;
                            layoutTemplate = hbs.cache[tpl].layoutTemplate;

                            if (layoutTemplate) {
                                _context2.next = 32;
                                break;
                            }

                            _context2.next = 31;
                            return hbs.getLayoutTemplate();

                        case 31:
                            layoutTemplate = _context2.sent;

                        case 32:

                            // Add the current koa context to templateOptions.data to provide access
                            // to the request within helpers.
                            if (!hbs.templateOptions.data) {
                                hbs.templateOptions.data = {};
                            }

                            hbs.templateOptions.data = merge(hbs.templateOptions.data, { koa: this });

                            // Run the compiled templates
                            locals.body = template(locals, hbs.templateOptions);
                            ctx.body = layoutTemplate(locals, hbs.templateOptions);

                        case 36:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));

        return function (_x3, _x4) {
            return _ref2.apply(this, arguments);
        };
    }();
};

/**
 * Get layout path
 */

Hbs.prototype.getLayoutPath = function (layout) {
    if (this.layoutsPath) {
        return path.join(this.layoutsPath, layout + this.extname);
    }

    return path.join(this.viewPath, layout + this.extname);
};

/**
 * Lazy load default layout in cache.
 */
Hbs.prototype.getLayoutTemplate = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
    return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
            switch (_context3.prev = _context3.next) {
                case 0:
                    if (!(this.disableCache || !this.layoutTemplate)) {
                        _context3.next = 4;
                        break;
                    }

                    _context3.next = 3;
                    return this.cacheLayout();

                case 3:
                    this.layoutTemplate = _context3.sent;

                case 4:
                    return _context3.abrupt('return', this.layoutTemplate);

                case 5:
                case 'end':
                    return _context3.stop();
            }
        }
    }, _callee3, this);
}));

/**
 * Get a default layout. If none is provided, make a noop
 */

Hbs.prototype.cacheLayout = function () {
    var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(layout) {
        var hbs, layoutTemplate, rawLayout;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        hbs = this;

                        // Create a default layout to always use

                        if (!(!layout && !hbs.defaultLayout)) {
                            _context4.next = 3;
                            break;
                        }

                        return _context4.abrupt('return', hbs.handlebars.compile('{{{body}}}'));

                    case 3:

                        // Compile the default layout if one not passed
                        if (!layout) {
                            layout = hbs.defaultLayout;
                        }

                        _context4.prev = 4;
                        _context4.next = 7;
                        return hbs.loadLayoutFile(layout);

                    case 7:
                        rawLayout = _context4.sent;

                        layoutTemplate = hbs.handlebars.compile(rawLayout);
                        _context4.next = 14;
                        break;

                    case 11:
                        _context4.prev = 11;
                        _context4.t0 = _context4['catch'](4);

                        console.error(_context4.t0.stack);

                    case 14:
                        return _context4.abrupt('return', layoutTemplate);

                    case 15:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this, [[4, 11]]);
    }));

    return function (_x5) {
        return _ref4.apply(this, arguments);
    };
}();

/**
 * Load a layout file
 */

Hbs.prototype.loadLayoutFile = function () {
    var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(layout) {
        var hbs, file;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
            while (1) {
                switch (_context5.prev = _context5.next) {
                    case 0:
                        hbs = this;
                        file = hbs.getLayoutPath(layout);
                        _context5.next = 4;
                        return read(file);

                    case 4:
                        return _context5.abrupt('return', _context5.sent);

                    case 5:
                    case 'end':
                        return _context5.stop();
                }
            }
        }, _callee5, this);
    }));

    return function (_x6) {
        return _ref5.apply(this, arguments);
    };
}();

/**
 * Register helper to internal handlebars instance
 */

Hbs.prototype.registerHelper = function () {
    this.handlebars.registerHelper.apply(this.handlebars, arguments);
};

/**
 * Register partial with internal handlebars instance
 */

Hbs.prototype.registerPartial = function () {
    this.handlebars.registerPartial.apply(this.handlebars, arguments);
};

/**
 * Register directory of partials
 */

Hbs.prototype.registerPartials = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
    var self, readdir, theme, partialsPath, resultList, files, names, partials, key, partial, i;
    return _regenerator2.default.wrap(function _callee6$(_context6) {
        while (1) {
            switch (_context6.prev = _context6.next) {
                case 0:
                    self = this;

                    readdir = function readdir(root) {
                        return new _promise2.default(function (resolve, reject) {
                            glob('**/*' + self.extname, {
                                cwd: root
                            }, function (err, files) {
                                if (err) throw err;
                                resolve(files);
                            });
                        });
                    };

                    theme = self.getTheme();
                    _context6.prev = 3;
                    partialsPath = path.resolve(self.partialsPath, theme);
                    _context6.next = 7;
                    return readdir(partialsPath);

                case 7:
                    resultList = _context6.sent;
                    files = [];
                    names = [];

                    if (resultList.length) {
                        _context6.next = 12;
                        break;
                    }

                    return _context6.abrupt('return');

                case 12:

                    // Generate list of files and template names
                    resultList.forEach(function (result, i) {
                        files.push(path.join(partialsPath, result));
                        names.push(theme + result.slice(0, -1 * self.extname.length));
                    });

                    // Read all the partial from disk
                    // var partials = await files.map(read);
                    partials = [];
                    _context6.t0 = _regenerator2.default.keys(files);

                case 15:
                    if ((_context6.t1 = _context6.t0()).done) {
                        _context6.next = 23;
                        break;
                    }

                    key = _context6.t1.value;
                    _context6.next = 19;
                    return read(files[key]);

                case 19:
                    partial = _context6.sent;

                    partials.push(partial);
                    _context6.next = 15;
                    break;

                case 23:

                    for (i = 0; i !== partials.length; i++) {
                        self.registerPartial(names[i], partials[i]);
                    }

                    self.partialsRegistered = true;
                    _context6.next = 31;
                    break;

                case 27:
                    _context6.prev = 27;
                    _context6.t2 = _context6['catch'](3);

                    console.error('Error caught while registering partials');
                    console.error(_context6.t2);

                case 31:
                case 'end':
                    return _context6.stop();
            }
        }
    }, _callee6, this, [[3, 27]]);
}));

Hbs.prototype.getTemplatePath = function getTemplatePath(tpl) {
    var cache = this.pathCache || (this.pathCache = {});
    if (cache[tpl]) return cache[tpl];

    var tplPath = path.join(this.viewPath, tpl + this.extname);
    try {
        fs.statSync(tplPath);
        if (!this.disableCache) cache[tpl] = tplPath;

        return tplPath;
    } catch (e) {
        throw e;
    }

    return void 0;
};

/**
 * The contentFor helper delegates to here to populate block content
 */

Hbs.prototype.content = function (name, options, context) {
    // fetch block
    var block = this.blocks[name] || (this.blocks[name] = []);

    // render block and save for layout render
    block.push(options.fn(context));
};

/**
 * block helper delegates to this function to retreive content
 */

Hbs.prototype.block = function (name) {
    // val = block.toString
    var val = (this.blocks[name] || []).join('\n');

    // clear the block
    this.blocks[name] = [];
    return val;
};
//# sourceMappingURL=index.js.map