declare module "npm-registry-fetch" {
  function json(package: string): Promise<any>

  export { json }
}
