"use strict";

const startAdapter = require("./adapter/build/main");

if (require.main !== module) {
  module.exports = startAdapter;
} else {
  startAdapter();
}
