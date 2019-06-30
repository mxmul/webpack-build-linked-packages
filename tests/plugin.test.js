const path = require("path");
const MemoryFS = require("memory-fs");
const webpack = require("webpack");
const rimraf = require("rimraf");
const WebpackBuildLinkedPackages = require("..");

describe("app with one linked dep", () => {
  const webpackConfig = {
    context: path.resolve(__dirname, "fixtures", "app-with-one-linked-dep"),
    entry: "./index.js"
  };

  beforeEach(done => {
    process.chdir(
      path.resolve(__dirname, "fixtures", "app-with-one-linked-dep")
    );
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
});
