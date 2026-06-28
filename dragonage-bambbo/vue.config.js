const { defineConfig } = require("@vue/cli-service");
const path = require("path");

module.exports = defineConfig({
  publicPath:
    process.env.NODE_ENV === "production"
      ? "/Dragon_age_trpg_board/" // <-- 여기를 본인의 깃허브 레포지토리 이름으로 바꾸세요
      : "/",
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src/"),
      },
    },
  },
});
