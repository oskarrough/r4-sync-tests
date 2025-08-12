In order to run the lib/r5.ts file from node/cli, we have a wrapper CLI.

Run `bun ./r5-cli.ts help`.

This also allows LLMs to test it out and easily pipe the data around.

On the /sdk route we have a "terminal ui" as well, which kinda allows the same. For this to work, we have a `cli-translator.js` that takes a string like "r5 channels pull <slug>" and calls the appropriate function.
