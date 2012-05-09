
fs = require('fs')
path = require('path')
exec = require('child_process').exec

less_dir = "views/less"
less_srcs = [ "#{less_dir}/index.less" ]
styles_dir = "static/styles"

option '-x', '--compress', 'compress compiled code'

task 'css', 'build css from less bootstrap', (options) ->
  fs.mkdir styles_dir
  for src in less_srcs
    fname = path.basename src, '.less'
    console.info "lessc #{src} > #{styles_dir}/#{fname}.css"
    exec "lessc #{src} > #{styles_dir}/#{fname}.css", (err, stdo, stde) ->
      console.error err, stde, stdo if err != null
    if options.compress
      console.info "lessc --compress #{src} > #{styles_dir}/#{fname}.min.css"
      exec "lessc --compress #{src} > #{styles_dir}/#{fname}.min.css", (err, stdo, stde) ->
        console.error err, stde, stdo if err != null
