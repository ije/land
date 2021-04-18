# land

Run Deno X module without installation.

### Installation

```bash
deno install --allow-net --allow-read --allow-write --allow-run -f -n land https://deno.land/x/land@v0.5.0/cli.ts
```

### Usage

```bash
# deno run --prompt https://deno.land/x/aleph/cli.ts init
land aleph init
```

### How it works?

`land` will check the deno.land third-party module meta at bootstrap, when the `cli.ts` or `cli.js` found then run it as sub-process, or use the `mod.ts`. It also checks the `import_map.json` (or `import-map.json` in the root directory) and apply it automatically.

### Version

By default, `land` use the latest version of the module, you also can specify the version like:

```bash
land aleph@0.2.28 init
land aleph@0.2 init  # match latest patch version
land aleph@1 init  # match latest minor version
```

### Permissions

By default, `land` will ask you the permissions of the module is using, or you can pass the permissions list:

```bash
land --allow-net --allow-read --allow-write aleph init
```

`land` supports `PERMISSIONS(.txt)` preset in the module root directory like:

```txt
--allow-net
--allow-read
--allow-write
```
