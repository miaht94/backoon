"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirname = exports.transformEnvironmentName = void 0;
const path_1 = require("path");
/**
 * Transform an environment name to be used as a process name
 *
 * @param environmentName
 */
const transformEnvironmentName = (environmentName) => environmentName
    .trim()
    .toLowerCase()
    .replace(/[ \/\\]/g, '-') || 'mock';
exports.transformEnvironmentName = transformEnvironmentName;
/**
 * Get the path directory, except if it's a URL.
 *
 * @param path
 * @returns
 */
const getDirname = (path) => {
    if (!path.startsWith('http')) {
        return (0, path_1.dirname)(path);
    }
    return null;
};
exports.getDirname = getDirname;
