#!/usr/bin/env node

###
Builds Javascript, HTML and CSS from Coffeescript, Jade and Stylus.
###

# Load the must-have dependencies
cli  = require 'cli'
fs   = require 'fs'
path = require 'path'
util = require 'util'

# Try and load the optional dependencies
coffee = try require 'coffee-script'
jade   = try require 'jade'
nib    = try require 'nib'
squash = try require 'squash'
stylus = try require 'stylus'

# Parse the options
options = cli.parse
  'script-in':   ['ic', 'The path of the root script (and optional alias)',  'string', './scripts=app']
  'script-out':  ['oc', 'The path to write the combined script to',          'path',   './scripts/app.js']
  'jade-in':     ['ij', 'The path of the directory containing Jade files',   'path',   './templates/jade']
  'jade-out':    ['oj', 'The path of the directory to write HTML files to',  'path',   './templates/html']
  'stylus-in':   ['is', 'The path of the directory containing Stylus files', 'path',   './styles/stylus']
  'stylus-out':  ['os', 'The path of the directory to write CSS files to',   'path',   './styles/css']
  'clean':       ['rm', 'Clean the output directories first',                'bool',   true]

###
Reads a directory recursively.
###
readdirRecursiveSync = (dir) ->
  results = []
  for file in fs.readdirSync dir
    file = path.join dir, file
    stat = fs.statSync file
    results.push file if stat.isFile()
    results = results.concat readdirRecursiveSync file if stat.isDirectory()
  return results

###
Cleans the output directories.
###
clean = ->
  try fs.unlinkSync options['script-out']
  try
    for file in readdirRecursiveSync options['jade-out']
      fs.unlinkSync file if path.extname(file) is '.html'
  try
    for file in readdirRecursiveSync options['stylus-out']
      fs.unlinkSync file if path.extname(file) is '.css'

###
Builds a Javascript file from the given root script using Squash.
###
build_script = ->
  return unless squash and options['script-in'] and options['script-out']
  
  cli.debug "Building script #{path.normalize options['script-in']} -> #{path.normalize options['script-out']}"
  
  # A Squash handler for coffeescript files
  coffee_handler = (file) ->
    # Just compile the file with coffee
    coffee.compile fs.readFileSync file, 'utf8'
  
  # A Squash handler for jade files
  jade_handler = (file) ->
    # Get the callback code
    js = String jade.compile fs.readFileSync(file, 'utf8'),
      client:   true
      filename: file
    
    # Build a script that contains the Jade runtime in a `jade` variable, then
    # the actual jade function
    """
    var jade = {
      attrs: #{String jade.runtime.attrs},
      escape: #{String jade.runtime.escape},
      rethrow: #{String jade.runtime.rethrow}
    };
    module.exports = #{js};
    """
  
  # Set the options for squash
  squash_options =
    # The directory to resolve the initial requires from
    cwd: '.'
    
    # Handlers for additional file extensions (filled later)
    extensions: {}
    
    # Handler for missing requires
    relax: (file, from) ->
      cli.error "Could not find module `#{file}` from `#{from}`"
    
    # The initial requires (filled later)
    requires: {}
  
  # Add a handler for coffeescript extensions if the module is available
  squash_options.extensions['.coffee'] = coffee_handler if coffee
  
  # Add a handler for jade extensions if the module is available
  squash_options.extensions['.jade'] = jade_handler if jade
  
  # Add the initial requires
  [file, alias] = options['script-in'].split '='
  squash_options.requires[file] = alias ? file
  
  # Actually execute the build with squash
  fs.writeFileSync options['script-out'], new squash.Squash(squash_options).squash()
  cli.info "Built script @ #{path.normalize options['script-out']}"

###
Compiles HTML files from Jade files.
###
build_jade = ->
  return unless jade and options['jade-in'] and options['jade-out']
  
  cli.debug "Building jade #{path.normalize options['jade-in']} -> #{path.normalize options['jade-out']}"
  
  # Compiles a single Jade file into HTML
  build_file = (file) ->
    try
      html = jade.compile(fs.readFileSync(file, 'utf8'), filename: file)()
    catch e
      html = "<pre>#{String e}</pre>"
      cli.error String e
    out  = path.join options['jade-out'], path.basename(file[0..-path.extname(file).length]) + 'html'
    fs.writeFileSync out, html
    cli.info "Built HTML   @ #{out}"
  
  # Scan the input directory and compile any .jade files
  for file in readdirRecursiveSync options['jade-in']
    build_file file if path.extname(file) is '.jade'

###
Compiles CSS files from Stylus files.
###
build_stylus = ->
  return unless stylus and options['stylus-in'] and options['stylus-out']
  
  cli.debug "Building stylus #{path.normalize options['stylus-in']} -> #{path.normalize options['stylus-out']}"
  
  # Compiles a single stylus file into CSS
  build_file = (file) ->
    styl = fs.readFileSync file, 'utf8'
    out  = path.join options['stylus-out'], path.basename(file[0..-path.extname(file).length]) + 'css'
    
    css  = stylus(styl).set 'filename', file
    css.use nib() if nib
    css.render (err, css) =>
      cli.error err if err
      fs.writeFileSync out, css ? String err
      cli.info "Built CSS    @ #{out}"
  
  # Scan the input directory and compile any .styl files
  for file in readdirRecursiveSync options['stylus-in']
    build_file file if path.extname(file) is '.styl'

clean() if options.clean
build_script()
build_jade()
build_stylus()