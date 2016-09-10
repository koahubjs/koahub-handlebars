var fs = require('fs');
var path = require('path');
var glob = require('glob');

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

var merge = function (obj1, obj2) {
    var c = {};
    var keys = Object.keys(obj2);
    for (var i = 0; i !== keys.length; i++) {
        c[keys[i]] = obj2[keys[i]];
    }

    keys = Object.keys(obj1);
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

var read = function (filename) {
    return function (done) {
        fs.readFile(filename, {encoding: 'utf8'}, done);
    };
};

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

    if (!this.viewPath && !options.viewPath) {
        throw new Error('must specify view path');
    }

    // Attach options
    options = options || {};
    this.viewPath = options.viewPath || this.viewPath;
    this.handlebars = options.handlebars || this.handlebars;
    this.templateOptions = options.templateOptions || options.templateOptions || {};
    this.extname = options.extname || this.extname || '.html';
    this.partialsPath = options.partialsPath || this.partialsPath || [];
    this.defaultLayout = options.defaultLayout || this.defaultLayout || '';
    this.layoutsPath = options.layoutsPath || this.layoutsPath || '';
    this.locals = options.locals || this.locals || {};
    this.disableCache = options.disableCache || this.disableCache || true;
    this.partialsRegistered = false;

    if (!Array.isArray(this.viewPath)) {
        this.viewPath = [this.viewPath];
    }

    // Cache templates and layouts
    this.cache = {};

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

    return function *(next) {
        this.render = render;
        yield* next;
    };
};

/**
 * Create a render generator to be attached to koa context
 */

Hbs.prototype.createRenderer = function () {
    var hbs = this;

    return function *(tpl, locals) {
        var tplPath = hbs.getTemplatePath(tpl),
            template, rawTemplate, layoutTemplate;

        // allow absolute paths to be used
        if (path.isAbsolute(tpl)) {
            tplPath = tpl + hbs.extname;
        }

        locals = merge(this.state || {}, locals || {});
        locals = merge(hbs.locals, locals);

        // Initialization... move these actions into another function to remove
        // unnecessary checks
        if (!hbs.partialsRegistered && hbs.partialsPath !== '') {
            yield hbs.registerPartials();
        }

        // Load the template
        if (hbs.disableCache || !hbs.cache[tpl]) {
            rawTemplate = yield read(tplPath);
            hbs.cache[tpl] = {
                template: hbs.handlebars.compile(rawTemplate)
            };

            // Load layout if specified
            if (rLayoutPattern.test(rawTemplate)) {
                var layout = rLayoutPattern.exec(rawTemplate)[1];
                var rawLayout = yield hbs.loadLayoutFile(layout);
                hbs.cache[tpl].layoutTemplate = hbs.handlebars.compile(rawLayout);
            }
        }

        template = hbs.cache[tpl].template;
        layoutTemplate = hbs.cache[tpl].layoutTemplate;
        if (!layoutTemplate) {
            layoutTemplate = yield hbs.getLayoutTemplate();
        }

        // Add the current koa context to templateOptions.data to provide access
        // to the request within helpers.
        if (!hbs.templateOptions.data) {
            hbs.templateOptions.data = {};
        }

        hbs.templateOptions.data = merge(hbs.templateOptions.data, {koa: this});

        // Run the compiled templates
        locals.body = template(locals, hbs.templateOptions);
        this.body = layoutTemplate(locals, hbs.templateOptions);
    };
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
Hbs.prototype.getLayoutTemplate = function*() {
    if (this.disableCache || !this.layoutTemplate) {
        this.layoutTemplate = yield this.cacheLayout();
    }
    return this.layoutTemplate;
}

/**
 * Get a default layout. If none is provided, make a noop
 */

Hbs.prototype.cacheLayout = function (layout) {
    var hbs = this;
    return function*() {
        // Create a default layout to always use
        if (!layout && !hbs.defaultLayout) {
            return hbs.handlebars.compile('{{{body}}}');
        }

        // Compile the default layout if one not passed
        if (!layout) {
            layout = hbs.defaultLayout;
        }

        var layoutTemplate;
        try {
            var rawLayout = yield hbs.loadLayoutFile(layout);
            layoutTemplate = hbs.handlebars.compile(rawLayout);
        } catch (err) {
            console.error(err.stack);
        }

        return layoutTemplate;
    };
};

/**
 * Load a layout file
 */

Hbs.prototype.loadLayoutFile = function (layout) {
    var hbs = this;
    return function (done) {
        var file = hbs.getLayoutPath(layout);
        read(file)(done);
    };
};

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

Hbs.prototype.registerPartials = function () {
    var self = this;

    if (!Array.isArray(this.partialsPath)) {
        this.partialsPath = [this.partialsPath];
    }

    /* thunk creator for readdirp */
    var readdir = function (root) {
        return function (done) {
            glob('**/*' + self.extname, {
                cwd: root,
            }, done);
        };
    };

    /* Read in partials and register them */
    return function *() {
        try {
            var resultList = yield self.partialsPath.map(readdir);
            var files = [];
            var names = [];

            if (!resultList.length) {
                return;
            }

            // Generate list of files and template names
            resultList.forEach(function (result, i) {
                result.forEach(function (file) {
                    files.push(path.join(self.partialsPath[i], file));
                    names.push(file.slice(0, -1 * self.extname.length));
                });
            });

            // Read all the partial from disk
            var partials = yield files.map(read);
            for (var i = 0; i !== partials.length; i++) {
                self.registerPartial(names[i], partials[i]);
            }

            self.partialsRegistered = true;
        } catch (e) {
            console.error('Error caught while registering partials');
            console.error(e);
        }

    };
};

Hbs.prototype.getTemplatePath = function getTemplatePath(tpl) {
    var cache = (this.pathCache || (this.pathCache = {}));
    if (cache[tpl])
        return cache[tpl];

    for (var i = 0; i !== this.viewPath.length; i++) {
        var viewPath = this.viewPath[i];
        var tplPath = path.join(viewPath, tpl + this.extname);
        try {
            fs.statSync(tplPath);
            if (!this.disableCache)
                cache[tpl] = tplPath;

            return tplPath;
        } catch (e) {
            continue;
        }
    }

    return void 0;
};
