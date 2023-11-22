"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const commons_1 = require("@mockoon/commons");
const commons_server_1 = require("@mockoon/commons-server");
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const util_1 = require("util");
const config_1 = require("./config");
const data_1 = require("./libs/data");
const utils_1 = require("./libs/utils");
dotenv_1.default.config();
class Application {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = 8080;
        this.runApplication = () => __awaiter(this, void 0, void 0, function* () {
            this.mockoonServer = yield this.runMockoon("./resources/mock1.json");
            console.log("Run Mockoon finished");
            this.app.get('/', (req, res) => __awaiter(this, void 0, void 0, function* () {
                res.status(200);
                res.send('Express + TypeScript Server');
            }));
            this.app.patch("/env/:envName", (req, res) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                let newEnvName = req.params["envName"];
                if (!fs_1.default.existsSync(`./resources/${newEnvName}`)) {
                    res.status(404);
                    res.send(`Not found file ./resources/${newEnvName}`);
                }
                else
                    try {
                        (_a = this.mockoonServer) === null || _a === void 0 ? void 0 : _a.stop();
                        this.mockoonServer = yield this.runMockoon(`./resources/${newEnvName}`);
                        res.status(200);
                        res.json(`Patched mockoon server to use resources/${newEnvName}`);
                    }
                    catch (_b) {
                        res.status(500);
                        res.send("Error happened when patch new env to mockoon");
                    }
            }));
            this.app.delete('/stop', (req, res) => __awaiter(this, void 0, void 0, function* () {
                if (this.mockoonServer) {
                    this.mockoonServer.stop();
                    res.status(200);
                    res.send('Stopped Mockoon Server');
                }
                else {
                    res.status(400);
                    res.send('Mockoon Server have not started yet!');
                }
            }));
            this.app.listen(this.port, () => {
                console.log(`⚡️[server]: Server is running at http://localhost:${this.port}`);
            });
        });
        this.runMockoon = (envFilePath) => __awaiter(this, void 0, void 0, function* () {
            try {
                const parsedEnvironment = yield (0, data_1.parseDataFiles)(envFilePath);
                try {
                    parsedEnvironment.environment = yield (0, data_1.prepareEnvironment)({
                        environment: parsedEnvironment.environment,
                        userOptions: {
                            hostname: "localhost",
                            port: 3001
                        },
                        repair: false
                    });
                }
                catch (error) {
                    return Promise.reject(null);
                }
                let mockoonServer = this.createServer({
                    environment: parsedEnvironment.environment,
                    environmentDir: (0, utils_1.getDirname)(parsedEnvironment.originalPath) || '',
                    logTransaction: false,
                    fileTransportOptions: false
                        ? null
                        : {
                            filename: (0, path_1.join)(config_1.Config.logsPath, `${(0, utils_1.transformEnvironmentName)(parsedEnvironment.environment.name)}.log`)
                        }
                });
                return Promise.resolve(mockoonServer);
            }
            catch (error) {
                //   this.error(error.message);
                return Promise.reject(null);
            }
        });
        this.createServer = (parameters) => {
            const logger = (0, commons_server_1.createLoggerInstance)(parameters.fileTransportOptions);
            const server = new commons_server_1.MockoonServer(parameters.environment, {
                environmentDirectory: parameters.environmentDir
            });
            (0, commons_server_1.listenServerEvents)(server, parameters.environment, logger, parameters.logTransaction);
            server.on('error', (errorCode, originalError) => {
                const exitErrors = [
                    commons_1.ServerErrorCodes.PORT_ALREADY_USED,
                    commons_1.ServerErrorCodes.PORT_INVALID,
                    commons_1.ServerErrorCodes.HOSTNAME_UNAVAILABLE,
                    commons_1.ServerErrorCodes.HOSTNAME_UNKNOWN,
                    commons_1.ServerErrorCodes.CERT_FILE_NOT_FOUND,
                    commons_1.ServerErrorCodes.UNKNOWN_SERVER_ERROR
                ];
                let errorMessage = originalError === null || originalError === void 0 ? void 0 : originalError.message;
                switch (errorCode) {
                    case commons_1.ServerErrorCodes.PORT_ALREADY_USED:
                    case commons_1.ServerErrorCodes.PORT_INVALID:
                        errorMessage = (0, util_1.format)(commons_server_1.ServerMessages[errorCode], parameters.environment.port);
                        break;
                    case commons_1.ServerErrorCodes.UNKNOWN_SERVER_ERROR:
                        errorMessage = (0, util_1.format)(commons_server_1.ServerMessages[errorCode], originalError === null || originalError === void 0 ? void 0 : originalError.message);
                        break;
                    case commons_1.ServerErrorCodes.CERT_FILE_NOT_FOUND:
                        errorMessage = commons_server_1.ServerMessages[errorCode];
                        break;
                    case commons_1.ServerErrorCodes.HOSTNAME_UNAVAILABLE:
                    case commons_1.ServerErrorCodes.HOSTNAME_UNKNOWN:
                        errorMessage = (0, util_1.format)(commons_server_1.ServerMessages[errorCode], parameters.environment.hostname);
                        break;
                }
                // Cannot use this.error() as Oclif does not catch it (it seems to be lost due to the async nature of Node.js http server.listen errors).
                if (exitErrors.includes(errorCode)) {
                    // this.log(`${chalkRed(' »')}   Error: ${errorMessage}`);
                    // process.exit(2);
                }
            });
            process.on('SIGINT', () => {
                server.stop();
            });
            server.start();
            return server;
        };
    }
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    let myApp = new Application();
    yield myApp.runApplication();
}))();
