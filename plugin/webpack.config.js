const path = require("path");

module.exports = {
  entry: "./src/code.ts",
  output: {
    filename: "code.js",
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    browsers: ["Chrome >= 70"], // Figma uses modern Chrome
                  },
                  modules: false,
                },
              ],
              "@babel/preset-typescript",
            ],
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  target: "web",
  mode: "development",
  devtool: "inline-source-map",
};
