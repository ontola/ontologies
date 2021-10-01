import { promisify } from "util";
import { exec as execCb } from "child_process";

import { Package } from "./types";

const exec = promisify(execCb);

export const verify = async (ontologies: Package[]): Promise<Package[]> => {
  for (let ontology of ontologies) {
    console.log(`Verifying ${ontology.info.name}`);
    await exec(`tsc --noEmit packages/${ontology.info.symbol}/index.ts`);
  }

  return ontologies;
}
