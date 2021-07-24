const { src, dest, parallel, series, watch } = require('gulp')
const del = require('del')
const browserSync = require('browser-sync')
const minimist = require('minimist')
const gulpLoadPlugins = require('gulp-load-plugins')

const config = require('./config')
const data = require('./data')

const $ = gulpLoadPlugins()
const bs = browserSync.create()
// 判断当前运行的环境
const argv = minimist(process.argv.slice(2))
const isProd = process.env.NODE_ENV
  ? process.env.NODE_ENV === 'production'
  : argv.production || argv.prod || false

// 清除构建后的目录
const clean = () => {
  return del([config.dist, config.temp])
}

// 编译scss
const style = () => {
  return src(config.paths.styles, {
    base: config.src,
    cwd: config.src,
    sourcemaps: !isProd
  })
    .pipe($.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.temp))
    .pipe(bs.reload({ stream: true }))
}
// 编译JS
const script = () => {
  return src(config.paths.scripts, {
    base: config.src,
    cwd: config.src,
    sourcemaps: !isProd
  })
    .pipe($.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.temp))
    .pipe(bs.reload({ stream: true }))
}
// 处理HTML文件
const page = () => {
  return src(config.paths.pages, { base: config.src, cwd: config.src })
    .pipe($.swig({ defaults: { cache: false, locals: data(`${config.src}/data`) } }))
    .pipe(dest(config.temp))
    .pipe(bs.reload({ stream: true }))
}
// 处理图片
const image = () => {
  return src(config.paths.images, { base: config.src, cwd: config.src })
    .pipe($.imagemin())
    .pipe(dest(config.dist))
}
// 处理字体
const font = () => {
  return src(config.paths.fonts, { base: config.src, cwd: config.src })
    .pipe($.imagemin())
    .pipe(dest(config.dist))
}
// 拷贝静态资源
const extra = () => {
  return src('**', { base: config.public, cwd: config.public })
    .pipe(dest(config.dist))
}
// 创建热更新开发服务器
const serve = () => {
  watch(config.paths.styles, { cwd: config.src }, style)
  watch(config.paths.scripts, { cwd: config.src }, script)
  watch(config.paths.pages, { cwd: config.src }, page)

  // 降低开发阶段无意义的处理任务，因此监听到资源文件变化后仅刷新浏览器不处理文件
  watch([
    config.paths.images,
    config.paths.fonts
  ], { cwd: config.src }, bs.reload)

  watch([
    '**'
  ], { cwd: config.public }, bs.reload)

  bs.init({
    notify: false,
    port: argv.port === undefined ? 2080 : argv.port,
    open: argv.open === undefined ? false : argv.open,
    // open: false,
    // files: 'dist/**',
    server: {
      baseDir: [config.temp, config.src, config.public], // 依次从路径中读文件
      routes: { // 优先级高于baseDir配置
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src(config.paths.pages, { base: config.temp, cwd: config.temp })
    .pipe($.useref({ searchPath: [config.temp, '.'] }))
  // html js css 文件压缩处理
    .pipe($.if(/\.js$/, $.uglify()))
    .pipe($.if(/\.css$/, $.cleanCss()))
    .pipe($.if(/\.html$/, $.htmlmin({
      collapseWhitespace: true, // 压缩html文件中的空格
      minifyCSS: true, // 压缩html文件中的内部CSS
      minifyJS: true, // 压缩html文件中的内部JS
      removeComments: true, // 清除HTML注释
      collapseBooleanAttributes: true, // 省略布尔属性的值
      removeEmptyAttributes: true, // 删除所有空格作属性值
      removeScriptTypeAttributes: true, // 删除<script>的type="text/javascript"
      removeStyleLinkTypeAttributes: true // 删除<style>和<link>的type="text/css"
    })))
    .pipe(dest(config.dist))
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
