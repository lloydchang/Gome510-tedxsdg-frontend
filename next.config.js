// File: next.config.js
const webpack = require("webpack");

module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /require-in-the-middle|@opentelemetry\/instrumentation\/build\/esm\/platform\/node/,
        })
      );
    }
    return config;
  },
};
