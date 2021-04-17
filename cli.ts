import { parse } from 'https://deno.land/std@0.93.0/flags/mod.ts'

const denoPermissionFlags = [
  '-A',
  '--allow-all',
  '--allow-env',
  '--allow-hrtime',
  '--allow-net',
  '--allow-plugin',
  '--allow-read',
  '--allow-run',
  '--allow-write',
]

async function main() {
  const { _: args, ...options } = parse(Deno.args)
  if (args.length == 0) {
    // todo: print help message
    return
  }

  let [appName, version] = args.shift()!.toString().split('@')
  if (!version) {
    const versionMetaUrl = `https://cdn.deno.land/${appName}/meta/versions.json`
    const resp = await fetch(versionMetaUrl)
    if (resp.status === 404) {
      console.error(`App '${appName}' not found`)
      Deno.exit(1)
    }
    if (resp.status !== 200) {
      console.error(resp.statusText + ':', versionMetaUrl)
      Deno.exit(1)
    }
    const { latest } = await resp.json()
    version = latest
  }

  const metaUrl = `https://cdn.deno.land/${appName}/versions/${version}/meta/meta.json`
  const resp = await fetch(metaUrl)
  if (resp.status === 404) {
    console.error(`App '${appName}' not found`)
    Deno.exit(1)
  }
  if (resp.status !== 200) {
    console.error(resp.statusText)
    Deno.exit(1)
  }
  const { directory_listing } = await resp.json()

  let command: string | null = null
  let importMap: string | null = null
  for (const name of ['cli.ts', 'cli.js', 'mod.ts', 'mod.js']) {
    if (directory_listing.some((entry: any) => entry.type === 'file' && entry.path === `/${name}`)) {
      command = name
      break
    }
  }
  for (const filename of Array.from(['import_map', 'import-map', 'importMap', 'importmap']).map(name => `${name}.json`)) {
    if (directory_listing.some((entry: any) => entry.type === 'file' && entry.path === `/${filename}`)) {
      importMap = filename
      break
    }
  }

  if (command === null) {
    console.error(`command not found`)
    Deno.exit(1)
  }

  const permissionFlags: string[] = []
  const denoFlags: string[] = []
  const appFlags: string[] = []
  for (const key of Object.keys(options)) {
    const value = options[key]
    const rawKey = (key.length === 1 ? '-' : '--') + key
    if (denoPermissionFlags.includes(rawKey)) {
      permissionFlags.push(rawKey)
    } else if (['-r', '--reload', '--no-check'].includes(rawKey)) {
      denoFlags.push(rawKey)
    } else if (rawKey === '--location') {
      denoFlags.push(`--location=${value}`)
    } else {
      if (value && value !== true) {
        appFlags.push(`${rawKey}=${value}`)
      } else {
        appFlags.push(rawKey)
      }
    }
  }
  if (permissionFlags.length === 0) {
    permissionFlags.push('--prompt')
  }
  if (!denoFlags.some(f => f.startsWith('--location='))) {
    denoFlags.push(`--location=http://0.0.0.0`)
  }
  if (importMap !== null) {
    denoFlags.push(`--import-map=https://deno.land/x/${appName}@${version}/${importMap}`)
  }

  const cmd = Deno.run({
    cmd: [
      Deno.execPath(),
      'run',
      '--unstable',
      ...denoFlags,
      ...permissionFlags,
      `https://deno.land/x/${appName}@${version}/${command}`,
      ...args.map(a => a.toString()),
      ...appFlags
    ],
    stdin: 'inherit',
    stdout: 'inherit',
  })
  await cmd.status()
  cmd.close()
}

if (import.meta.main) {
  main()
}
