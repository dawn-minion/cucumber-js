const { promisify } = require("bluebird");
const glob = require("glob");
const path = require("path");
const fsExtra = require("fs-extra");

const globP = promisify(glob);

async function main() {
  const matches = await globP("src/**/*.js", {
    absolute: true,
    cwd: path.join(__dirname, "..")
  });
  for (const match of matches) {
    await fsExtra.move(match, match.replace(".js", ".ts"));
  }
}

main()
  .then(() => console.log("done"))
  .catch(err => console.log("error", err));
