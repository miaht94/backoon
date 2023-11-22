"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonFlags = exports.deprecatedFlags = void 0;
const core_1 = require("@oclif/core");
// Keep deprecated flags for backward compatibility
exports.deprecatedFlags = {
    pname: core_1.Flags.string({
        char: 'N',
        required: false,
        default: [],
        multiple: true,
        hidden: true
    }),
    'daemon-off': core_1.Flags.boolean({
        char: 'D',
        required: false,
        default: false,
        hidden: true
    })
};
exports.commonFlags = {
    help: core_1.Flags.help({ char: 'h' }),
    'log-transaction': core_1.Flags.boolean({
        char: 't',
        description: 'Log the full HTTP transaction (request and response)',
        default: false
    }),
    data: core_1.Flags.string({
        char: 'd',
        description: 'Path(s) or URL(s) to your Mockoon data file(s)',
        required: true,
        multiple: true
    })
};
