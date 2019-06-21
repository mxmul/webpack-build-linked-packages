const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const validateOptions = require('schema-utils');
const schema = require('./options-schema.json');

class WebpackBuildLinkedPackages {
  constructor (options = {}) {
    validateOptions(schema, options, 'WebpackBuildLinkedPackages');
    this.options = {
      scriptName: 'build',
      ...options
    };
  }

  apply (compiler) {
    compiler.hooks.beforeCompile.tap(
      'WebpackBuildLinkedPackages',
      () => {
        const nodeModules = path.resolve('node_modules');
        if (!fs.existsSync(nodeModules)) {
          return;
        }

        const linkedPackages = fs.readdirSync(nodeModules);
        linkedPackages.forEach(relpath => {
          const packagePath = path.resolve(nodeModules, relpath);
          const stats = fs.lstatSync(packagePath);
          if (stats.isSymbolicLink()) {
            const prevCwd = process.cwd();
            try {
              process.chdir(packagePath);
              const packageJson = JSON.parse(fs.readFileSync('package.json'));
              const scripts = packageJson.scripts || {};
              execSync(`npm run-script --if-present --silent ${this.options.scriptName}`);
            } finally {
              process.chdir(prevCwd);
            }
          }
        });
      }
    );
  }
};

module.exports = WebpackBuildLinkedPackages;
