import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: "inherit", ...options });
}
export function iosPrerequisites() {
  if (process.platform !== "darwin")
    throw new Error(
      "iOS simulator checks require macOS with full Xcode 26.4+ and an installed iOS Simulator runtime.",
    );
  try {
    const version = run("xcodebuild", ["-version"], {
      encoding: "utf8",
      stdio: "pipe",
    });
    const match = version.match(/Xcode (\d+)\.(\d+)/);
    if (
      !match ||
      Number(match[1]) < 26 ||
      (Number(match[1]) === 26 && Number(match[2]) < 4)
    )
      throw new Error();
    run("xcrun", ["simctl", "list", "devices", "available", "--json"], {
      stdio: "pipe",
    });
  } catch {
    throw new Error(
      "Select full Xcode 26.4+ with xcode-select and install an iOS Simulator runtime. Command Line Tools alone cannot build or run Pool for iOS.",
    );
  }
  if (spawnSync("maestro", ["--version"], { stdio: "ignore" }).status !== 0)
    throw new Error(
      "Install Maestro to run the native UI journeys (see docs/expo-migration/README.md).",
    );
}
if (
  !process.argv.includes("--from-harness") &&
  !process.argv.includes("--smoke")
) {
  try {
    iosPrerequisites();
    run(process.execPath, ["scripts/auth-browser.mjs", "--ios"]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
} else {
  let directory;
  try {
    iosPrerequisites();
    if (
      !process.argv.includes("--smoke") &&
      (process.env.AUTH_TEST_DISPOSABLE !== "1" ||
        process.env.EXPO_PUBLIC_SUPABASE_URL !== "http://localhost:55321")
    )
      throw new Error(
        "Native journeys may only use the harness-owned disposable Supabase project.",
      );
    const available = JSON.parse(
      run("xcrun", ["simctl", "list", "devices", "available", "--json"], {
        encoding: "utf8",
        stdio: "pipe",
      }),
    );
    const devices = Object.values(available.devices)
      .flat()
      .filter(
        (device) => device.isAvailable && device.name.startsWith("iPhone"),
      );
    const device =
      devices.find((device) => device.state === "Booted") ?? devices.at(-1);
    if (!device) throw new Error("Install an iPhone simulator runtime first.");
    console.log(`Preparing iOS Simulator: ${device.name}`);
    console.log(
      "Generating the Expo iOS project and installing native dependencies.",
    );
    run(process.execPath, [
      "node_modules/expo/bin/cli",
      "prebuild",
      "--platform",
      "ios",
      "--no-install",
    ]);
    run("pod", ["install"], { cwd: resolve("ios") });
    directory = mkdtempSync(join(tmpdir(), "pool-ios-"));
    console.log(
      "Building unsigned Release for the selected simulator architecture.",
    );
    run("xcodebuild", [
      "-quiet",
      "-workspace",
      "ios/Pool.xcworkspace",
      "-scheme",
      "Pool",
      "-configuration",
      "Release",
      "-sdk",
      "iphonesimulator",
      "-destination",
      `id=${device.udid}`,
      "-derivedDataPath",
      directory,
      "ONLY_ACTIVE_ARCH=YES",
      "CODE_SIGNING_ALLOWED=NO",
    ]);
    const application = join(
      directory,
      "Build/Products/Release-iphonesimulator/Pool.app",
    );
    if (!existsSync(application))
      throw new Error("Simulator application was not built.");
    console.log(
      "Installing the simulator application and running native UI smoke.",
    );
    if (device.state !== "Booted")
      run("xcrun", ["simctl", "boot", device.udid]);
    run("xcrun", ["simctl", "bootstatus", device.udid, "-b"]);
    run("xcrun", ["simctl", "install", device.udid, application]);
    run("maestro", ["--device", device.udid, "test", "tests/ios/smoke.yaml"]);
    if (!process.argv.includes("--smoke")) {
      const { nativeJourneys } = await import("./ios-journeys.mjs");
      await nativeJourneys({ device: device.udid, run, directory });
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
}
