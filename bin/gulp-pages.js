#!/usr/bin/env node

process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
// 导入当前项目中的gulpfile文件路径
process.argv.push(require.resolve('..'))

// console.log(process.argv)
require('gulp/bin/gulp')
