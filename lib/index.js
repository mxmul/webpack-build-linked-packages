/* eslint-disable no-console */
const execa = require("execa");
const fs = require("fs");
const path = require("path");
const validateOptions = require("schema-utils");
const chalk = require("chalk");
const ora = require("ora");
const allSettled = require("promise.allsettled");
const globby = require("globby");
const asciitree = require("ascii-tree");
const schema = require("./options-schema.json");

function formatLinkedPackage(packagePath) {
  const realLocation = fs.realpathSync(packagePath);
  const packageName = path.basename(packagePath);
  return `${chalk.bold.blue(packageName)} (linked from ${chalk.bold(
    realLocation
  )})`;
}

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

        const symlinkedPackages = globby
          .sync("**/node_modules/**", {
            onlyDirectories: true
          })
          .filter(p => fs.lstatSync(p).isSymbolicLink())
          .sort();

        if (!symlinkedPackages.length) {
          console.log("No packages are currently linked.");
          return Promise.resolve();
        }

        console.log("The following packages are currently symlinked:");

        const treeInput = symlinkedPackages
          .map(packagePath => {
            const depth = (packagePath.match(/\/node_modules\//g) || []).length;
            return `${"#".repeat(depth + 2)}${formatLinkedPackage(
              packagePath
            )}`;
          })
          .join("\n");

        const tree = asciitree.generate(`# \n${treeInput}`);
        console.log(`${tree}\n`);

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

            // eslint-disable-next-line import/no-dynamic-require, global-require
            const availableScripts = require(`${path.resolve(
              packagePath
            )}/package.json`).scripts;
            if (
              !availableScripts ||
              !availableScripts[this.options.scriptName]
            ) {
              spinner.warn(
                `Couldn't find script ${chalk.bold.magenta(
                  this.options.scriptName
                )} in linked package ${chalk.bold.blue(
                  packageName
                )}, so not rebuilding. Available scripts are: ${chalk.bold.magenta(
                  Object.keys(availableScripts).join(", ")
                )}`
              );
              return Promise.resolve();
            }

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
