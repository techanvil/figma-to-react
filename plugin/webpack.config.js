const path = require("path");

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === "development";

  return {
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
                      // Figma plugins run in a sandboxed environment
                      chrome: "70",
                    },
                    // Don't transform modules - let webpack handle bundling
                    modules: false,
                    // Ensure object spread is properly handled
                    include: ["@babel/plugin-proposal-object-rest-spread"],
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
    target: ["web", "es5"], // Figma plugins run in a restricted browser-like environment
    mode: isDevelopment ? "development" : "production",
    devtool: isDevelopment ? "inline-source-map" : "source-map",
    // Add watch options for better development experience
    watchOptions: {
      ignored: /node_modules/,
      poll: 1000,
    },
    // Optimize for Figma plugin environment
    optimization: {
      minimize: !isDevelopment,
    },
  };
};
