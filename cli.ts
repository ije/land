import { parseArgs } from "https://deno.land/std@0.217.0/cli/parse_args.ts";
import { bold, dim } from "https://deno.land/std@0.217.0/fmt/colors.ts";
import { cache } from "./cache.ts";
import { VERSION } from "./version.ts";

type DirEntry = {
  type: string;
  path: string;
};

const denoPermissionFlags = [
  "-A",
  "--allow-all",
  "--allow-env",
  "--allow-ffi",
  "--allow-hrtime",
  "--allow-net",
  "--allow-read",
  "--allow-run",
  "--allow-write",
  "--allow-sys",
  "--deny-env",
  "--deny-ffi",
  "--deny-hrtime",
  "--deny-net",
  "--deny-read",
  "--deny-run",
  "--deny-write",
  "--deny-sys",
];

const supportedModuleExts = [
  ".ts",
  ".tsx",
  ".mts",
  ".js",
  ".jsx",
  ".mjs",
];

async function main() {
  const { _: args, ...options } = parseArgs(
    Deno.args.filter((a) => !denoPermissionFlags.includes(a)),
  );
  if (args.length == 0) {
    console.log(bold("LAND"), VERSION);
    console.log(dim("Homepage: "), "https://deno.land/x/land");
    console.log(dim("Repo: "), "https://github.com/ije/land");
    return;
  }

  let [moduleName, version] = args.shift()!.toString().split("@");
  const versionMetaUrl =
    `https://cdn.deno.land/${moduleName}/meta/versions.json`;
  const resp1 = await fetch(versionMetaUrl);
  if (resp1.status === 404 || resp1.status === 403) {
    console.error(`Module "${moduleName}" not found`);
    Deno.exit(1);
  }
  if (resp1.status !== 200) {
    console.error(resp1.statusText + ":", versionMetaUrl);
    Deno.exit(1);
  }

  const { latest, versions } = await resp1.json();
  if (!version) {
    version = latest;
  } else if (!versions.includes(version)) {
    const v = version;
    if (v.startsWith("v")) {
      version = v.slice(1);
    } else {
      version = "v" + v;
    }
    if (!versions.includes(version)) {
      for (const ver of versions) {
        if (ver.startsWith(v)) {
          version = ver;
          break;
        } else if (v.startsWith("v") && ver.startsWith(v.slice(1))) {
          version = ver;
          break;
        } else if (!v.startsWith("v") && ver.startsWith("v" + v)) {
          version = ver;
          break;
        }
      }
    }
    if (!versions.includes(version)) {
      console.error(`Version "${v}" not found`);
      Deno.exit(1);
    }
    if (version != v) {
      console.log(dim(`Found version ${version}`));
    }
  }

  const { content } = await cache(
    `https://cdn.deno.land/${moduleName}/versions/${version}/meta/meta.json`,
  );
  const { directory_listing } = JSON.parse(new TextDecoder().decode(content));

  let command: string | null = null;
  let importMap: string | null = null;
  for (
    const name of ["cli", "main", "mod"].map((name) =>
      supportedModuleExts.map((ext) => `${name}${ext}`)
    ).flat()
  ) {
    if (
      directory_listing.some((entry: DirEntry) =>
        entry.type === "file" && entry.path === `/${name}`
      )
    ) {
      command = name;
      break;
    }
  }
  for (
    const filename of [
      "import_map.json",
      "import-map.json",
      "importMap.json",
      "importmap.json",
    ]
  ) {
    if (
      directory_listing.some((entry: DirEntry) =>
        entry.type === "file" && entry.path === `/${filename}`
      )
    ) {
      importMap = filename;
      break;
    }
  }

  if (command === null) {
    console.error(`No command entry file found in ${moduleName}`);
    Deno.exit(1);
  }

  const permissionFlags: string[] = [];
  const denoFlags: string[] = [];
  const appFlags: string[] = [];
  for (const f of Deno.args) {
    if (denoPermissionFlags.includes(f)) {
      permissionFlags.push(f);
    }
  }
  for (const key of Object.keys(options)) {
    const value = options[key];
    const flagKey = (key.length === 1 ? "-" : "--") + key;
    if (flagKey === "--location" && typeof value === "string") {
      try {
        const url = new URL(value);
        denoFlags.push(`--location=${url.toString()}`);
      } catch (_e) {
        // ignore
      }
    }
    if (value && value !== true) {
      appFlags.push(`${flagKey}=${value}`);
    } else {
      appFlags.push(flagKey);
    }
  }
  if (permissionFlags.length === 0) {
    const permissionsFile = directory_listing.find((entry: DirEntry) =>
      entry.type === "file" &&
      (entry.path === `/PERMISSIONS` || entry.path === `/PERMISSIONS.txt`)
    );
    if (permissionsFile) {
      const { content } = await cache(
        `https://cdn.deno.land/${moduleName}/versions/${version}/raw${permissionsFile.path}`,
      );
      const text = new TextDecoder().decode(content);
      const list = text.split("\n").map((line) => {
        const value = line.trim();
        return denoPermissionFlags.find((p) =>
          value === p || "--" + value === p
        ) || "";
      }).filter(Boolean);
      permissionFlags.push(...list);
      if (permissionFlags.length > 0) {
        console.log(dim(`Land Permissions: ${list.join(" ")}`));
      }
    }
  }
  if (!denoFlags.some((f) => f.startsWith("--location="))) {
    denoFlags.push(`--location=http://0.0.0.0`);
  }
  if (importMap !== null) {
    denoFlags.push(
      `--import-map=https://deno.land/x/${moduleName}@${version}/${importMap}`,
    );
  }

  const cmd = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      ...denoFlags,
      ...permissionFlags,
      `https://deno.land/x/${moduleName}@${version}/${command}`,
      ...args.map((a: string | number) => a.toString()),
      ...appFlags,
    ],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  await cmd.spawn().status;
}

if (import.meta.main) {
  main();
}
