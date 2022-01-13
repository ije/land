/** `VERSION` managed by https://deno.land/x/publish */
export const VERSION = "0.8.0"

/** `prepublish` will be invoked before publish */
export async function prepublish(version: string) {
  const readme = await Deno.readTextFile('./README.md')

  await Deno.writeTextFile('./README.md', readme.replace(
    /\/\/deno\.land\/x\/land@v[\d\.]+\//,
    `//deno.land/x/land@v${version}/`
  ))
}

export async function postpublish(version: string) {
  console.log('Upgraded to', version)
}
