# land

Run Deno X modules without installation.

### Installation

```bash
deno install -A -f -n land https://deno.land/x/land@v0.10.0/cli.ts
```

### Usage

```bash
# equals to `deno run https://deno.land/x/publish@latest/cli.ts
land publish
```

### How it works?

`land` will check the deno.land third-party module metadata at bootstrap, when the `cli.ts` or `cli.js` found then run it as sub-process, or use the `mod.ts` or `mod.js`. It also checks the `import_map.json` (or `import-map.json`) in the root directory and apply it automatically.

### Versioning

By default, `land` will use the latest version of the module, you also can specify the version with [semver](https://semver.org/):

```bash
land publish@1.0.0 # match exact version
land publish@1.0   # match latest patch version
land publish@1     # match latest minor version
```

### Permissions

By default, `land` will ask you the permissions of the module is using, or you can pass the permissions manually:

```bash
land --allow-net --allow-read --allow-write publish
```

`land` supports `PERMISSIONS(.txt)` preset in the module root directory like:

```txt
--allow-net
--allow-read
--allow-write
```
