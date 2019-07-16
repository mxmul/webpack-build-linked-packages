/**
 * @jest-environment node
 */
const path = require("path");
const MemoryFS = require("memory-fs");
const webpack = require("webpack");
const rimraf = require("rimraf");
const WebpackBuildLinkedPackages = require("..");

describe("app with linked deps", () => {
  const webpackConfig = {
    context: path.resolve(__dirname, "fixtures", "app-with-linked-deps"),
    entry: "./index.js"
  };

  beforeEach(done => {
    process.chdir(path.resolve(__dirname, "fixtures", "app-with-linked-deps"));
    rimraf(path.resolve(__dirname, "fixtures", "*", "lib"), done);
  });

  it("fails to build without plugin when linked library isn't built", done => {
    const compiler = webpack(webpackConfig);
    compiler.outputFileSystem = new MemoryFS();

    compiler.run((err, stats) => {
      expect(err).toBeNull();
      const statsJson = stats.toJson();
      expect(statsJson.errors).toHaveLength(1);
      expect(statsJson.errors[0]).toMatch(/Can't resolve 'some-other-library'/);
      done();
    });
  });

  it("builds successfuly with plugin when linked library isn't built", done => {
    const compiler = webpack({
      ...webpackConfig,
      plugins: [new WebpackBuildLinkedPackages()]
    });
    compiler.outputFileSystem = new MemoryFS();

    compiler.run((err, stats) => {
      expect(err).toBeNull();
      const statsJson = stats.toJson();
      expect(statsJson.errors).toHaveLength(0);
      done();
    });
  });

  it("warns about missing scripts", done => {
    const compiler = webpack({
      ...webpackConfig,
      plugins: [new WebpackBuildLinkedPackages()]
    });
    compiler.outputFileSystem = new MemoryFS();

    compiler.run((err, stats) => {
      expect(err).toBeNull();
      const statsJson = stats.toJson();
      expect(statsJson.errors).toHaveLength(0);
      done();
    });
  });
});

describe("app with erroring deps", () => {
  const webpackConfig = {
    context: path.resolve(__dirname, "fixtures", "app-with-erroring-deps"),
    entry: "./index.js"
  };

  beforeEach(done => {
    process.chdir(
      path.resolve(__dirname, "fixtures", "app-with-erroring-deps")
    );
    rimraf(path.resolve(__dirname, "fixtures", "*", "lib"), done);
  });

  it("fails the build if a package's script errors", done => {
    const compiler = webpack({
      ...webpackConfig,
      plugins: [new WebpackBuildLinkedPackages()]
    });
    compiler.outputFileSystem = new MemoryFS();

    compiler.run((err, stats) => {
      // Webpack shouldn't run at all
      expect(stats).toBeFalsy();
      expect(err).toMatch(
        /Bailing on webpack build due to errors in linked packages. See output above for details./
      );
      done();
    });
  });
});
