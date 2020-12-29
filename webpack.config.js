const fs = require("fs");
const path = require("path");
const Dotenv = require("dotenv-webpack");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;

const extensions = fs.readdirSync("./src/entries/");
const entry = Object.fromEntries(
  extensions.map((e) => [e.substring(0, e.length - 3), `./src/entries/${e}`])
);

module.exports = (env) => ({
  entry,
  resolve: {
    modules: ["node_modules"],
    extensions: [".ts", ".js", ".tsx"],
  },
  output: {
    path: path.join(__dirname, "build"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
              cacheCompression: false,
            },
          },
          {
            loader: "ts-loader",
            options: {
              compilerOptions: {
                noEmit: false,
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [
          (info) => {
            const relative = path
              .relative(path.join(__dirname, "node_modules"), info.realResource)
              .replace(/\//g, "-")
              .replace(/\\/g, "-")
              .replace(/\.js/g, "");
            const className = relative.split("-")[0];
            return {
              loader: "style-loader",
              options: {
                attributes: {
                  id: `roamjs-style-${relative}`,
                  class: `roamjs-style-${className}`,
                },
              },
            };
          },
          "css-loader",
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: "file-loader",
          },
        ],
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: "url-loader?limit=100000",
      },
    ],
  },
  plugins: [
    new Dotenv({
      path: ".env.local",
      systemvars: true,
      silent: true,
    }),
    ...(env && env.analyze
      ? [
          new BundleAnalyzerPlugin({
            analyzerMode: "static",
          }),
        ]
      : []),
  ],
});
