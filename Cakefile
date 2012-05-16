
fs = require('fs')
path = require('path')
exec = require('child_process').exec

less_dir = "views/less"
src = "#{less_dir}/index.less"
styles_dir = "static/styles"

option '-x', '--compress', 'compress compiled code'

task 'css', 'build css from less bootstrap', (options) ->
  fs.mkdir styles_dir
  compile_less(options)

task 'csswatch', 'build css and watch for changes', (options) ->
  fs.mkdir styles_dir
  fs.stat src, (err, prevStats) ->
    throw err if err
    watcher = fs.watch src, callback = (ev) ->
      watcher.close()
      try  # if source no longer exists, never mind
        watcher = fs.watch src, callback
      fs.stat src, (err, stats) ->
        throw err if err
        return if stats.size is prevStats.size and
          stats.mtime.getTime() is prevStats.mtime.getTime()
        prevStats = stats
        compile_less options
  # compile_less options
  console.info "watching for changes on #{src}"

# -- helpers

compile_less = (options) ->
  fname = path.basename src, '.less'
  console.info "lessc #{src} > #{styles_dir}/#{fname}.css"
  exec "lessc #{src} > #{styles_dir}/#{fname}.css", (err, stdo, stde) ->
    console.error err, stde, stdo if err != null
  if options.compress
    console.info "lessc --compress #{src} > #{styles_dir}/#{fname}.min.css"
    exec "lessc --compress #{src} > #{styles_dir}/#{fname}.min.css", (err, stdo, stde) ->
      console.error err, stde, stdo if err != null
