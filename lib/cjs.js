
/*
Builds Javascript, HTML and CSS from Coffeescript, Jade and Stylus.
*/

(function() {
  var build_jade, build_script, build_stylus, clean, cli, coffee, fs, jade, nib, options, path, readdirRecursiveSync, squash, stylus, util;

  cli = require('cli');

  fs = require('fs');

  path = require('path');

  util = require('util');

  coffee = (function() {
    try {
      return require('coffee-script');
    } catch (_error) {}
  })();

  jade = (function() {
    try {
      return require('jade');
    } catch (_error) {}
  })();

  nib = (function() {
    try {
      return require('nib');
    } catch (_error) {}
  })();

  squash = (function() {
    try {
      return require('squash');
    } catch (_error) {}
  })();

  stylus = (function() {
    try {
      return require('stylus');
    } catch (_error) {}
  })();

  options = cli.parse({
    'script-in': ['ic', 'The path of the root script (and optional alias)', 'string', './scripts=app'],
    'script-out': ['oc', 'The path to write the combined script to', 'path', './scripts/app.js'],
    'jade-in': ['ij', 'The path of the directory containing Jade files', 'path', './templates/jade'],
    'jade-out': ['oj', 'The path of the directory to write HTML files to', 'path', './templates/html'],
    'stylus-in': ['is', 'The path of the directory containing Stylus files', 'path', './styles/stylus'],
    'stylus-out': ['os', 'The path of the directory to write CSS files to', 'path', './styles/css'],
    'clean': ['rm', 'Clean the output directories first', 'bool', true]
  });

  /*
  Reads a directory recursively.
  */

  readdirRecursiveSync = function(dir) {
    var file, results, stat, _i, _len, _ref;
    results = [];
    _ref = fs.readdirSync(dir);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      file = _ref[_i];
      file = path.join(dir, file);
      stat = fs.statSync(file);
      if (stat.isFile()) results.push(file);
      if (stat.isDirectory()) results = results.concat(readdirRecursiveSync(file));
    }
    return results;
  };

  /*
  Cleans the output directories.
  */

  clean = function() {
    var file, _i, _j, _len, _len2, _ref, _ref2, _results;
    try {
      fs.unlinkSync(options['script-out']);
    } catch (_error) {}
    try {
      _ref = readdirRecursiveSync(options['jade-out']);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        if (path.extname(file) === '.html') fs.unlinkSync(file);
      }
    } catch (_error) {}
    try {
      _ref2 = readdirRecursiveSync(options['stylus-out']);
      _results = [];
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        file = _ref2[_j];
        if (path.extname(file) === '.css') {
          _results.push(fs.unlinkSync(file));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    } catch (_error) {}
  };

  /*
  Builds a Javascript file from the given root script using Squash.
  */

  build_script = function() {
    var alias, coffee_handler, file, jade_handler, squash_options, _ref;
    if (!(squash && options['script-in'] && options['script-out'])) return;
    cli.debug("Building script " + (path.normalize(options['script-in'])) + " -> " + (path.normalize(options['script-out'])));
    coffee_handler = function(file) {
      return coffee.compile(fs.readFileSync(file, 'utf8'));
    };
    jade_handler = function(file) {
      var js;
      js = String(jade.compile(fs.readFileSync(file, 'utf8'), {
        client: true,
        filename: file
      }));
      return "var jade = {\n  attrs: " + (String(jade.runtime.attrs)) + ",\n  escape: " + (String(jade.runtime.escape)) + ",\n  rethrow: " + (String(jade.runtime.rethrow)) + "\n};\nmodule.exports = " + js + ";";
    };
    squash_options = {
      cwd: '.',
      extensions: {},
      relax: function(file, from) {
        return cli.error("Could not find module `" + file + "` from `" + from + "`");
      },
      requires: {}
    };
    if (coffee) squash_options.extensions['.coffee'] = coffee_handler;
    if (jade) squash_options.extensions['.jade'] = jade_handler;
    _ref = options['script-in'].split('='), file = _ref[0], alias = _ref[1];
    squash_options.requires[file] = alias != null ? alias : file;
    fs.writeFileSync(options['script-out'], new squash.Squash(squash_options).squash());
    return cli.info("Built script @ " + (path.normalize(options['script-out'])));
  };

  /*
  Compiles HTML files from Jade files.
  */

  build_jade = function() {
    var build_file, file, _i, _len, _ref, _results;
    if (!(jade && options['jade-in'] && options['jade-out'])) return;
    cli.debug("Building jade " + (path.normalize(options['jade-in'])) + " -> " + (path.normalize(options['jade-out'])));
    build_file = function(file) {
      var html, out;
      try {
        html = jade.compile(fs.readFileSync(file, 'utf8'), {
          filename: file
        })();
      } catch (e) {
        html = "<pre>" + (String(e)) + "</pre>";
        cli.error(String(e));
      }
      out = path.join(options['jade-out'], path.basename(file.slice(0, -path.extname(file).length + 1 || 9e9)) + 'html');
      fs.writeFileSync(out, html);
      return cli.info("Built HTML   @ " + out);
    };
    _ref = readdirRecursiveSync(options['jade-in']);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      file = _ref[_i];
      if (path.extname(file) === '.jade') {
        _results.push(build_file(file));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  /*
  Compiles CSS files from Stylus files.
  */

  build_stylus = function() {
    var build_file, file, _i, _len, _ref, _results;
    if (!(stylus && options['stylus-in'] && options['stylus-out'])) return;
    cli.debug("Building stylus " + (path.normalize(options['stylus-in'])) + " -> " + (path.normalize(options['stylus-out'])));
    build_file = function(file) {
      var css, out, styl,
        _this = this;
      styl = fs.readFileSync(file, 'utf8');
      out = path.join(options['stylus-out'], path.basename(file.slice(0, -path.extname(file).length + 1 || 9e9)) + 'css');
      css = stylus(styl).set('filename', file);
      if (nib) css.use(nib());
      return css.render(function(err, css) {
        if (err) cli.error(err);
        fs.writeFileSync(out, css != null ? css : String(err));
        return cli.info("Built CSS    @ " + out);
      });
    };
    _ref = readdirRecursiveSync(options['stylus-in']);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      file = _ref[_i];
      if (path.extname(file) === '.styl') {
        _results.push(build_file(file));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  if (options.clean) clean();

  build_script();

  build_jade();

  build_stylus();

}).call(this);
