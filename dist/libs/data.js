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
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareEnvironment = exports.parseDataFiles = void 0;
const commons_1 = require("@mockoon/commons");
const commons_server_1 = require("@mockoon/commons-server");
const cli_ux_1 = require("@oclif/core/lib/cli-ux");
const fs_1 = require("fs");
const cli_messages_constants_1 = require("../constants/cli-messages.constants");
/**
 * Load and parse one or more JSON data file(s).
 *
 * @param filePaths
 */
const parseDataFiles = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    const openAPIConverter = new commons_server_1.OpenAPIConverter();
    const environments = [];
    let filePathIndex = 0;
    let errorMessage = `${cli_messages_constants_1.CLIMessages.DATA_INVALID}:`;
    try {
        const environment = yield openAPIConverter.convertFromOpenAPI(filePath);
        if (environment) {
            environments.push({ environment, originalPath: filePath });
        }
    }
    catch (openAPIError) {
        errorMessage += `\nOpenAPI parser: ${openAPIError.message}`;
        // immediately throw if the file is not a JSON file
        if (filePath.includes('.yml') || filePath.includes('.yaml')) {
            throw new Error(errorMessage);
        }
        try {
            let data;
            if (filePath.startsWith('http')) {
                data = yield (yield fetch(filePath)).text();
            }
            else {
                data = yield fs_1.promises.readFile(filePath, { encoding: 'utf-8' });
            }
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            if (typeof data === 'object') {
                environments.push({ environment: data, originalPath: filePath });
            }
        }
        catch (JSONError) {
            errorMessage += `\nMockoon parser: ${JSONError.message}`;
            throw new Error(errorMessage);
        }
        filePathIndex++;
    }
    if (environments.length === 0) {
        throw new Error(cli_messages_constants_1.CLIMessages.ENVIRONMENT_NOT_AVAILABLE_ERROR);
    }
    return environments[0];
});
exports.parseDataFiles = parseDataFiles;
/**
 * Check if an environment can be run by the CLI and
 * migrate it if needed.
 * Validate the environment schema (will automatically repair)
 *
 * @param environment
 */
const migrateAndValidateEnvironment = (environment, forceRepair) => __awaiter(void 0, void 0, void 0, function* () {
    // environment data are too old: lastMigration is not present
    if (environment.lastMigration === undefined && !forceRepair) {
        const promptResponse = yield (0, cli_ux_1.confirm)(`${environment.name ? '"' + environment.name + '"' : 'This environment'} does not seem to be a valid Mockoon environment or is too old. Let Mockoon attempt to repair it? (y/n)`);
        if (!promptResponse) {
            throw new Error(cli_messages_constants_1.CLIMessages.DATA_TOO_OLD_ERROR);
        }
    }
    // environment data migrated with a more recent version (if installed CLI version does not include @mockoon/commons with required migrations)
    if (environment.lastMigration > commons_1.HighestMigrationId) {
        throw new Error(cli_messages_constants_1.CLIMessages.DATA_TOO_RECENT_ERROR);
    }
    try {
        // apply migrations
        commons_1.Migrations.forEach((migration) => {
            if (migration.id > environment.lastMigration) {
                migration.migrationFunction(environment);
            }
        });
    }
    catch (error) {
        environment.lastMigration = commons_1.HighestMigrationId;
    }
    let validatedEnvironment = commons_1.EnvironmentSchema.validate(environment).value;
    if (!validatedEnvironment) {
        throw new Error(cli_messages_constants_1.CLIMessages.DATA_INVALID);
    }
    validatedEnvironment = (0, commons_1.repairRefs)(validatedEnvironment);
    return validatedEnvironment;
});
/**
 * Migrate the environment and override user defined options
 *
 * @param environments - path to the data file or export data
 * @param options
 */
const prepareEnvironment = (params) => __awaiter(void 0, void 0, void 0, function* () {
    params.environment = yield migrateAndValidateEnvironment(params.environment, params.repair);
    if (params.userOptions.port !== undefined) {
        params.environment.port = params.userOptions.port;
    }
    if (params.userOptions.hostname !== undefined) {
        params.environment.hostname = params.userOptions.hostname;
    }
    return params.environment;
});
exports.prepareEnvironment = prepareEnvironment;
