import { exec } from "child_process"
import npmFetch from "npm-registry-fetch"
import semver from "semver"

import "./packages"
import { packageFolder, packagePackageJSON } from "./helpers"
import { Package } from './types';

export const publish = (ontologies: Package[]): Promise<Package[]> => {
  const folders = ontologies.map((ontology) => new Promise<Package>(async (resolve, reject) => {
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
      exec(`npm publish ../${packageFolder(ontology)} --dry-run`, (err) => {
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
