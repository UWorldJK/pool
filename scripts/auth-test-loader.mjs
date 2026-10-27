import { createRequire, registerHooks } from "node:module";

const require = createRequire(import.meta.url);
const nextModules = Object.fromEntries(
  ["next/headers", "next/navigation", "next/server", "next/cache"].map((name) => [
    name,
    require.resolve(name),
  ]),
);
// Match Next's aliases/extensionless imports while running the actual TS helpers
// with Node's built-in type stripping. Tests mock only framework/SDK boundaries.
export function registerAuthTestLoader() {
  return registerHooks({
    resolve(specifier, context, nextResolve) {
      if (nextModules[specifier])
        return nextResolve(nextModules[specifier], context);
      if (specifier.startsWith("@/"))
        return nextResolve(
          new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
          context,
        );
      if (
        specifier.startsWith(".") &&
        context.parentURL?.includes("/src/") &&
        !/\.[a-z]+$/.test(specifier)
      ) {
        return nextResolve(
          new URL(`${specifier}.ts`, context.parentURL).href,
          context,
        );
      }
      return nextResolve(specifier, context);
    },
  });
}
