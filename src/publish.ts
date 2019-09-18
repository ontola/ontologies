import { exec } from "child_process"
import npmFetch from "npm-registry-fetch"
import semver from "semver"

import "./packages"
import { packageFolder, packagePackageJSON } from "./helpers"
import { Ontology } from "./types"

export const publish = (ontologies: Ontology[]): Promise<Ontology[]> => {
  const folders = ontologies.map((ontology) => new Promise<Ontology>(async (resolve, reject) => {
    const localPackage = require(`../${packagePackageJSON(ontology)}`)
    const localVersion = localPackage.version
    const publishedPackage = await npmFetch.json(localPackage.name).catch((e) => {
      if(e.statusCode === 404) {
        return { version: '0.0.0' }
      }

      throw e
    })
    const publishedVersion = publishedPackage.version

    if (semver.gt(localVersion, publishedVersion)) {
      exec(`npm publish ../${packageFolder(ontology)}`, (err) => {
        if (err) {
          reject(ontology)
        }
        console.log(`Published ${localPackage.name}@${localVersion}`)
        resolve(ontology)
      })
    }

    resolve(ontology)
  }));

  return Promise.all(folders)
}
