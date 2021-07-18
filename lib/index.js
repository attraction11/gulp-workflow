const { src, dest, parallel, series, watch } = require('gulp')
const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()

// 以下不是gulp的插件，但可以在gulp中使用
const del = require('del')
const browserSync = require('browser-sync')
const bs = browserSync.create()
const cwd = process.cwd()
let config = {
  // default
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch { }

const clean = () => {
  return del([config.build.dist, config.build.temp])
}

const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    // .pipe(bs.reload({ stream: true }))
}

const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    // .pipe(bs.reload({ stream: true }))
}

const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data, cache: false }))
    .pipe(dest(config.build.temp))
    // .pipe(bs.reload({ stream: true }))
}

const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}

const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src }, style)
  watch(config.build.paths.scripts, { cwd: config.build.src }, script)
  watch(config.build.paths.pages, { cwd: config.build.src }, page)

  // image、font等文件变动后重载浏览器页面
  watch([
    config.build.paths.images,
    config.build.paths.fonts
  ], { cwd: config.build.src }, bs.reload)

  watch([
    '**'
  ], { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false,
    port: 2020,
    // open: false,
    files: 'dist/**',
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public], // 依次从路径中读文件
      routes: { // 优先级高于baseDir配置
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
  // html js css 文件压缩处理
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true, // 压缩html文件中的空格
      minifyCSS: true, // 压缩html文件中的内部CSS
      minifyJS: true, // 压缩html文件中的内部JS
      removeComments: true, // 清除HTML注释
      collapseBooleanAttributes: true, // 省略布尔属性的值
      removeEmptyAttributes: true, // 删除所有空格作属性值
      removeScriptTypeAttributes: true, // 删除<script>的type="text/javascript"
      removeStyleLinkTypeAttributes: true // 删除<style>和<link>的type="text/css"
    })))
    .pipe(dest(config.build.dist))
}

// 开发阶段减少image、font等文件变动的构建编译
const compile = parallel(style, script, page)
// 上线之前执行的任务
const build = series(
  clean,
  parallel(
    series(compile, useref),
    extra,
    image,
    font
  )
)
const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}
