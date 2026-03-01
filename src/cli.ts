import { run } from './runner.js';

run(process.argv.slice(2)).then((code) => process.exit(code));
