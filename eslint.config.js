import jiti from 'jiti';

const jitiInstance = jiti(import.meta.url);
const config = jitiInstance('./eslint.config.ts');

export default config.default || config;
