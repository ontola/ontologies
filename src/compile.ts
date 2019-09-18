import { ModuleResolutionKind } from 'ts-morph'
import ts, { ModuleKind } from 'typescript'

import tsconfig from '../tsconfig.json'

import { packageTSIndexFile } from './helpers'
import { Ontology } from './types'

export const compile = (ontologies: Ontology[]) => {
  for (const ontology of ontologies) {
    const program = ts.createProgram(
      [packageTSIndexFile(ontology)],
      {
        ...tsconfig.compilerOptions as unknown as ts.CompilerOptions,
        noEmit: false,
        module: ModuleKind.ES2015,
        moduleResolution: ModuleResolutionKind.NodeJs,
        declaration: true,
      }
    );
    const emitResult = program.emit();
    console.log(emitResult)
  }
}
