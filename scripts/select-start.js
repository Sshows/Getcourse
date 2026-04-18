const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: repoRoot,
    ...options
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function isRailwayRuntime() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT_ID ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_PUBLIC_DOMAIN
  );
}

if (isRailwayRuntime()) {
  console.log("SecureCourse start: Railway detected, starting NestJS backend.");
  run(npmCommand, ["run", "start:backend"], { cwd: repoRoot });
} else {
  console.log("SecureCourse start: frontend mode, starting Next.js app.");
  run(npmCommand, ["run", "start:frontend"], { cwd: repoRoot });
}
