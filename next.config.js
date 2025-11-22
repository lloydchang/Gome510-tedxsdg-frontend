// File: next.config.js
const webpack = require("webpack");

module.exports = {
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /require-in-the-middle|@opentelemetry\/instrumentation\/build\/esm\/platform\/node|@opentelemetry\/exporter-jaeger|@opentelemetry\/winston-transport/,
        })
      );
    }
    
    // Suppress OpenTelemetry warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@opentelemetry/,
      },
      {
        module: /node_modules\/@honeycombio/,
      },
      {
        module: /node_modules\/require-in-the-middle/,
      },
      {
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
      {
        message: /Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/,
      },
      {
        message: /Module not found: Can't resolve '@opentelemetry\/winston-transport'/,
      },
    ];
    
    return config;
  },
};
