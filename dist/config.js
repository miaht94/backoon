"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const os_1 = require("os");
const path_1 = require("path");
const version = require('../package.json').version;
const dirName = '.mockoon-cli';
exports.Config = {
    version,
    logsPath: (0, path_1.join)((0, os_1.homedir)(), `/${dirName}/logs/`)
};
