koahub handlebars templates

## Installation

```sh
$ npm install koahub-handlebars
```

## Use with koa

```js
 var koa = require('koa');
 var hbs = require('koahub-handlebars');

 var app = koa();

 // koahub-handlebars is middleware. `use` it before you want to render a view
 app.use(hbs.middleware({
   viewPath: __dirname + '/views'
 }));

 // Render is attached to the koa context. Call `this.render` in your middleware
 // to attach rendered html to the koa response body.
 app.use(function *() {
   yield this.render('index', {title: 'koahub-handlebars'});
 })

 app.listen(3000);

```

### Registering Helpers
Helpers are registered using the #registerHelper method. Here is an example
using the default instance (helper stolen from official Handlebars
[docs](http://handlebarsjs.com):

```javascript
hbs = require('koahub-handlebars');

hbs.registerHelper('link', function(text, url) {
  text = hbs.Utils.escapeExpression(text);
  url  = hbs.Utils.escapeExpression(url);

  var result = '<a href="' + url + '">' + text + '</a>';

  return new hbs.SafeString(result);
});
```
Your helper is then accessible in all views by using, `{{link "Google" "http://google.com"}}`

The `registerHelper`, `Utils`, and `SafeString` methods all proxy to an
internal Handlebars instance. If passing an alternative instance of
Handlebars to the middleware configurator, make sure to do so before
registering helpers via the koahub-handlebars proxy of the above functions, or
just register your helpers directly via your Handlebars instance.

You can also access the current Koa context in your helper. If you want to have
a helper that outputs the current URL, you could write a helper like the following
and call it in any template as `{{requestURL}}`.

```
hbs.registerHelper('requestURL', function() {
  var url = hbs.templateOptions.data.koa.request.url;
  return url;
});
```

### Registering Partials
The simple way to register partials is to stick them all in a directory, and
pass the `partialsPath` option when generating the middleware. Say your views
are in `./views`, and your partials are in `./views/partials`. Configuring the
middleware via

```
app.use(hbs.middleware({
  viewPath: __dirname + '/views',
  partialsPath: __dirname + '/views/partials'
}));
```

will cause them to be automatically registered. Alternatively, you may register partials one at a time by calling `hbs.registerPartial` which proxies to the cached handlebars `#registerPartial` method.

### Layouts
Passing `defaultLayout` with the a layout name will cause all templates to be
inserted into the `{{{body}}}` expression of the layout. This might look like
the following.

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
</head>
<body>
  {{{body}}}
</body>
</html>
```

In addition to, or alternatively, you may specify a layout to render a template
into. Simply specify `{{!< layoutName }}` somewhere in your template. koahub-handlebars
will load your layout from `layoutsPath` if defined, or from `viewPath`
otherwise.

At this time, only a single content block (`{{{body}}}`) is supported.

### Options
The plan for koahub-handlebars is to offer identical functionality as koa-hbs
(eventaully). These options are supported _now_.

- `viewPath`: [_required_] Full path from which to load templates
  (`Array|String`)
- `handlebars`: Pass your own instance of handlebars
- `templateOptions`: Hash of
  [handlebars options](http://handlebarsjs.com/execution.html#Options) to pass
  to `template()`
- `extname`: Alter the default template extension (default: `'.html'`)
- `partialsPath`: Full path to partials directory (`Array|String`)
- `defaultLayout`: Name of the default layout
- `layoutsPath`: Full path to layouts directory (`String`)
- `disableCache`: Disable template caching (default: `'.true'`)

### Locals

Application local variables (```[this.state](https://github.com/koajs/koa/blob/master/docs/api/context.md#ctxstate)```) are provided to all templates rendered within the application.

```javascript
app.use(function *(next) {
  this.state.title = 'My App';
  this.state.email = 'me@myapp.com';
  yield next;
});
```

The state object is a JavaScript Object. The properties added to it will be exposed as local variables within your views.

```
<title>{{title}}</title>

<p>Contact : {{email}}</p>
```

## Thanks
[koa-hbs](https://github.com/jwilm/koa-hbs)

## Differents
1. Configuration file incremental changes
2. Modify some of the features and the default configuration
3. ...


##
官网：[http://js.koahub.com](http://js.koahub.com)

[![image](http://www.koahub.com/public/ad.jpg "koahub软件市场")](http://www.koahub.com)