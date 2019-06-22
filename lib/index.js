/* eslint-disable no-console */
const execa = require("execa");
const fs = require("fs");
const path = require("path");
const validateOptions = require("schema-utils");
const chalk = require("chalk");
const ora = require("ora");
const allSettled = require("promise.allsettled");
const schema = require("./options-schema.json");

class WebpackBuildLinkedPackages {
  constructor(options = {}) {
    validateOptions(schema, options, "WebpackBuildLinkedPackages");
    this.options = {
      scriptName: "build",
      ...options
    };
  }

  apply(compiler) {
    compiler.hooks.beforeCompile.tapPromise(
      "WebpackBuildLinkedPackages",
      () => {
        const nodeModules = path.resolve("node_modules");
        if (!fs.existsSync(nodeModules)) {
          return Promise.resolve();
        }

        const packages = fs.readdirSync(nodeModules);
        const symlinkedPackages = packages
          .map(relpath => path.resolve(nodeModules, relpath))
          .filter(packagePath => {
            const stats = fs.lstatSync(packagePath);
            return stats.isSymbolicLink();
          });

        if (!symlinkedPackages.length) {
          console.log("No packages are currently linked.");
          return Promise.resolve();
        }

        console.log("The following packages are currently symlinked: \n");

        const symlinkList = symlinkedPackages
          .map(packagePath => {
            return `${chalk.bold.blue(
              path.basename(packagePath)
            )} (linked from ${chalk.bold(fs.realpathSync(packagePath))})`;
          })
          .join("\n - ");

        console.log(` - ${symlinkList}\n`);

        console.log(
          `Going to run the ${chalk.bold.magenta(
            this.options.scriptName
          )} script for each of them.\n`
        );

        return allSettled(
          symlinkedPackages.map(packagePath => {
            const packageName = path.basename(packagePath);
            const spinnerText = `Found linked package: ${chalk.bold.blue(
              packageName
            )}. Running ${chalk.bold.magenta(
              this.options.scriptName
            )} script...`;
            const spinner = ora(spinnerText);

            return execa(
              "npm",
              [
                "run-script",
                "--if-present",
                "--silent",
                this.options.scriptName
              ],
              { cwd: packagePath }
            )
              .catch(e => {
                spinner.fail(
                  `${chalk.bold.red("Error")} when running ${chalk.bold.magenta(
                    this.options.scriptName
                  )} in linked package ${chalk.bold.blue(packageName)}:\n`
                );
                console.error(e.all);
                return Promise.reject(e);
              })
              .then(() =>
                spinner.succeed(
                  `Ran ${chalk.bold.magenta(
                    this.options.scriptName
                  )} script for linked ${chalk.bold.blue(packageName)}!`
                )
              );
          })
        ).then(results => {
          const errors = results.filter(p => p.status === "rejected");
          console.log();
          if (errors.length) {
            return Promise.reject(
              chalk.bold.red(
                "Bailing on webpack build due to errors in linked packages. See output above for details."
              )
            );
          }
          return Promise.resolve();
        });
      }
    );
  }
}

module.exports = WebpackBuildLinkedPackages;
