import { execFileSync, spawn } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  cpSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";

// No external URL/key options: this command can only use the fresh CLI project
// it owns, on ports distinct from the developer's existing pool backend.
const directory = mkdtempSync(join(tmpdir(), "pool-auth-test-"));
const project = `pool-auth-test-${process.pid}`;
const cli = resolve("node_modules/.bin/supabase");
const network = `${project}-network`;
const args = ["--workdir", directory, "--network-id", network];
mkdirSync(join(directory, "supabase"), { recursive: true });
mkdirSync(join(directory, "auth/email"), { recursive: true });
for (const template of ["confirmation", "recovery"])
  copyFileSync(
    `auth/email/${template}.html`,
    join(directory, `auth/email/${template}.html`),
  );
let config = readFileSync("supabase/config.toml", "utf8")
  .replace('project_id = "pool"', `project_id = "${project}"`)
  .replaceAll("543", "553")
  .replace(
    'site_url = "http://localhost:3000"',
    'site_url = "http://localhost:3100"\njwt_expiry = 120',
  )
  .replace(
    'additional_redirect_urls = ["http://localhost:3001"]',
    'additional_redirect_urls = ["http://localhost:3100/auth/callback"]',
  )
  .replace("[realtime]\nenabled = true", "[realtime]\nenabled = false")
  .replace("[studio]\nenabled = true", "[studio]\nenabled = false")
  .replace(
    "[auth.email]\n",
    '[auth.email]\nmax_frequency = "1s"\notp_expiry = 10\n',
  );
config += `
[auth.rate_limit]
email_sent = 1000
token_refresh = 1000
sign_in_sign_ups = 1000
token_verifications = 1000
`;
writeFileSync(join(directory, "supabase/config.toml"), config);

let activeChild;
let appServer;
let backendAttempted = false;
let cleanupStarted = false;
function cleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  activeChild?.kill("SIGINT");
  appServer?.kill("SIGTERM");
  let stopped = !backendAttempted;
  try {
    if (backendAttempted)
      execFileSync(cli, ["stop", "--no-backup", ...args], {
        stdio: "ignore",
        timeout: 60_000,
      });
    stopped = true;
  } catch {
    console.error(
      `Disposable Auth cleanup failed; retain ${directory} and stop project ${project} on network ${network}.`,
    );
    process.exitCode = 1;
  }
  try {
    execFileSync("docker", ["network", "rm", network], { stdio: "ignore" });
  } catch {
    /* CLI may have removed it. */
  }
  if (stopped) rmSync(directory, { recursive: true, force: true });
}
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});
async function run(command, commandArgs, env) {
  await new Promise((resolveRun, reject) => {
    activeChild = spawn(command, commandArgs, { env, stdio: "inherit" });
    activeChild.on("error", reject);
    activeChild.on("exit", (code) =>
      code === 0
        ? resolveRun()
        : reject(new Error(`Auth validation command failed (${code})`)),
    );
  });
  activeChild = undefined;
}
try {
  await new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(new Error("Auth test app port 3100 is already in use")),
    );
    probe.listen(3100, "127.0.0.1", () => probe.close(resolvePort));
  });
  console.log(
    `Starting disposable Auth project ${project} in ${directory} on network ${network} (55320–55329). Existing pool data is untouched.`,
  );
  execFileSync(
    "docker",
    [
      "network",
      "create",
      "--driver",
      "bridge",
      "--opt",
      "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
      network,
    ],
    { stdio: "ignore" },
  );
  // Suppress CLI stdout because it prints admin credentials we neither use nor log.
  backendAttempted = true;
  execFileSync(cli, ["start", ...args], {
    stdio: ["ignore", "ignore", "inherit"],
    timeout: 600_000,
  });
  const status = JSON.parse(
    execFileSync(cli, ["status", "--output", "json", ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
  if (new URL(status.API_URL).origin !== "http://127.0.0.1:55321")
    throw new Error("Unexpected disposable API URL");
  const env = {
    ...process.env,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:55321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      status.PUBLISHABLE_KEY || status.ANON_KEY,
    SUPABASE_INTERNAL_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    SUPABASE_SECRET_KEY: "",
    AUTH_TEST_DISPOSABLE: "1",
    AUTH_TEST_OUTPUT_DIR: join(directory, "browser-results"),
    PORT: "3100",
    HOSTNAME: "127.0.0.1",
  };
  if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    throw new Error("Disposable public key missing");
  await run(
    process.execPath,
    ["node_modules/next/dist/bin/next", "build"],
    env,
  );
  cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
  cpSync("public", ".next/standalone/public", { recursive: true });
  appServer = spawn(process.execPath, [".next/standalone/server.js"], {
    env,
    stdio: "inherit",
  });
  let startupError;
  appServer.on("error", (error) => {
    startupError = error;
  });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (startupError || appServer.exitCode !== null)
      throw new Error("Auth test app failed to start");
    try {
      const response = await fetch("http://127.0.0.1:3100/api/health", {
        signal: AbortSignal.timeout(1000),
      });
      ready = response.ok;
    } catch {
      /* Server startup. */
    }
    if (ready) break;
    await new Promise((resolveReady) => setTimeout(resolveReady, 500));
  }
  if (!ready) throw new Error("Auth test app did not become ready");
  await run(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    env,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  cleanup();
}
