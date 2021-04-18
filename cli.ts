import { parse } from 'https://deno.land/std@0.93.0/flags/mod.ts'
import { dim, bold } from 'https://deno.land/std@0.93.0/fmt/colors.ts'
import { cache } from 'https://deno.land/x/cache@0.2.12/cache.ts'
import { VERSION } from './version.ts'

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
  const { _: args, ...options } = parse(Deno.args.filter(a => !denoPermissionFlags.includes(a)))
  if (args.length == 0) {
    console.log(bold('LAND'), VERSION)
    console.log(dim(`Homepage: `), `https://deno.land/x/land`)
    console.log(dim(`Repo: `), `https://github.com/postui/land`)
    return
  }

  let [moduleName, version] = args.shift()!.toString().split('@')
  const versionMetaUrl = `https://cdn.deno.land/${moduleName}/meta/versions.json`
  const resp1 = await fetch(versionMetaUrl)
  if (resp1.status === 404 || resp1.status === 403) {
    console.error(`Module '${moduleName}' not found`)
    Deno.exit(1)
  }
  if (resp1.status !== 200) {
    console.error(resp1.statusText + ':', versionMetaUrl)
    Deno.exit(1)
  }

  const { latest, versions } = await resp1.json()
  if (!version) {
    version = latest
  } else if (!versions.includes(version)) {
    const v = version
    if (v.startsWith('v')) {
      version = v.slice(1)
    } else {
      version = 'v' + v
    }
    if (!versions.includes(version)) {
      for (const ver of versions) {
        if (ver.startsWith(v)) {
          version = ver
          break
        } else if (v.startsWith('v') && ver.startsWith(v.slice(1))) {
          version = ver
          break
        } else if (!v.startsWith('v') && ver.startsWith('v' + v)) {
          version = ver
          break
        }
      }
    }
    if (!versions.includes(version)) {
      console.error(`Version '${v}' not found`)
      Deno.exit(1)
    }
    if (version != v) {
      console.log(dim(`Found version ${version}`))
    }
  }

  const file = await cache(`https://cdn.deno.land/${moduleName}/versions/${version}/meta/meta.json`)
  const { directory_listing } = JSON.parse(await Deno.readTextFile(file.path))

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
  for (const f of Deno.args) {
    if (denoPermissionFlags.includes(f)) {
      permissionFlags.push(f)
    }
  }
  for (const key of Object.keys(options)) {
    const value = options[key]
    const flagKey = (key.length === 1 ? '-' : '--') + key
    if (flagKey === '--location' && typeof value === 'string') {
      try {
        const url = new URL(value)
        denoFlags.push(`--location=${url.toString()}`)
      } catch (error) { }
    }
    if (value && value !== true) {
      appFlags.push(`${flagKey}=${value}`)
    } else {
      appFlags.push(flagKey)
    }
  }
  if (permissionFlags.length === 0) {
    const permissionsFile = directory_listing.find((entry: any) => entry.type === 'file' && (entry.path === `/PERMISSIONS` || entry.path === `/PERMISSIONS.txt`))
    if (permissionsFile) {
      const file = await cache(`https://cdn.deno.land/${moduleName}/versions/${version}/raw${permissionsFile.path}`)
      const text = await Deno.readTextFile(file.path)
      const list = text.split('\n').map(l => l.trim()).filter(Boolean).filter(l => !l.startsWith('#'))
      permissionFlags.push(...list)
      console.log(dim(`Land permissions: ${list.join(' ')}`))
    }
  }
  if (permissionFlags.length === 0) {
    permissionFlags.push('--prompt')
  }
  if (!denoFlags.some(f => f.startsWith('--location='))) {
    denoFlags.push(`--location=http://0.0.0.0`)
  }
  if (importMap !== null) {
    denoFlags.push(`--import-map=https://deno.land/x/${moduleName}@${version}/${importMap}`)
  }

  const cmd = Deno.run({
    cmd: [
      Deno.execPath(),
      'run',
      '--unstable',
      '--no-check',
      ...denoFlags,
      ...permissionFlags,
      `https://deno.land/x/${moduleName}@${version}/${command}`,
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
