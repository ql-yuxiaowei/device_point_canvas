const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  devServer: {
    proxy: {
      '/prod-api': {
        target: 'https://192.168.1.166:8889',
        changeOrigin: true,
        secure: false,
        pathRewrite: {
          '^/prod-api': '/prod-api'
        }
      }
    }
  }
})
