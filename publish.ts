/** `prepublish` will be invoked before publish, return `false` to prevent the publish. */
export async function prepublish(version: string) {
  const readme = await Deno.readTextFile('./README.md')

  await Deno.writeTextFile('./README.md', readme.replace(
    /\/\/deno\.land\/x\/land@v[\d\.]+\//,
    `//deno.land/x/land@v${version}/`
  ))
}

/** `postpublish` will be invoked after published. */
export async function postpublish(version: string) {
  console.log('Upgraded to', version)
}
