import { assert, nonempty, string, type } from "superstruct";

// Load config file
const config = require('../.config.json') as unknown;

// Make sure the config is the right shape
const configSchema = type({
  clientID: nonempty(string()),
  token: nonempty(string())
});

// Fail early if config is not expected shape
assert(config, configSchema);

export const clientID: string = config.clientID;
export const token: string = config.token;
