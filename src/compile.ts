import ts, { ModuleKind } from 'typescript'

import tsconfig from '../tsconfig.json'

import { packageTSIndexFile } from './helpers'
import { Ontology } from './types'

export const compile = (ontologies: Ontology[]) => {
  for (const ontology of ontologies) {
    const program = ts.createProgram(
      [packageTSIndexFile(ontology)],
      {
        ...tsconfig as unknown as ts.CompilerOptions,
        module: ModuleKind.ES2015,
        declaration: true,
      }
    );
    const emitResult = program.emit();
    console.log(emitResult)
  }
}
