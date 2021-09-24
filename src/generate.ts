import { SomeTerm } from '@ontologies/core';
import * as fs from "fs"
import Handlebars from "handlebars"
import {
  Project,
  StatementStructures,
  StructureKind,
  VariableDeclarationKind,
} from 'ts-morph'

import defaults from "../templates/defaults.package.json"
import { packageTSIndexFile } from "./helpers"
import {
  OntologyTerm,
  Package,
} from './types';

const RESERVED_KEYWORDS = [
  // Not JS spec, but reserved for custom terms
  'ns',

  // From https://www.w3schools.com/js/js_reserved.asp
  'abstract',
  'arguments',
  'await',
  'boolean',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'double',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'final',
  'finally',
  'float',
  'for',
  'function',
  'goto',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'int',
  'interface',
  'let',
  'long',
  'native',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'short',
  'static',
  'super',
  'switch',
  'synchronized',
  'this',
  'throw',
  'throws',
  'transient',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'volatile',
  'while',
  'with',
  'yield',

  'eval',
  'function',
  'hasOwnProperty',
  'Infinity',
  'isFinite',
  'isNaN',
  'isPrototypeOf',
  'NaN',
  /** Causes problems in Nodejs */
  'Object',
  'prototype',
  'undefined',
  'valueOf',
];

const firstValue = (it: SomeTerm[] | undefined): string | undefined =>
  it?.find(({ value }) => !!value)?.value;

export async function generate(ontologies: Package[]): Promise<Package[]> {
  const packages = new Project()

  const readmeTemplate = Handlebars.compile(fs.readFileSync("./templates/readme.template.md").toString('utf-8'))

  for (const ontology of ontologies) {
    const safeTermSymbol = (term: string) => {
      if (RESERVED_KEYWORDS.includes(term)) {
        return `${ontology.info.symbol}${term.replace('-', '_')}`
      }

      return term.replace('-', '_')
    }

    const packageJSON = Object.assign(
      {},
      defaults,
      {
        name: `@ontologies/${ontology.info.symbol}`,
        description: (firstValue(ontology.dict.self.comment) ?? firstValue(ontology.dict.self.label))?.trim(),
        version: ontology.info.version ?? defaults.version
      }
    )
    packages.createSourceFile(
      `packages/${ontology.info.symbol}/package.json`,
      JSON.stringify(packageJSON, null, 2)
    )

    packages.createSourceFile(
      `packages/${ontology.info.symbol}/README.md`,
      readmeTemplate({
        ...ontology.info,
        ...packageJSON,
        humanName: ontology.info.name,
        ontologiesRepo: 'https://github.com/ontola/ontologies',
        ns: ontology.info.ns,
        termCount: ontology.dict.classes.length + ontology.dict.properties.length + ontology.dict.otherTerms.length,
        classCount: ontology.dict.classes.length,
        propertyCount: ontology.dict.properties.length,
        otherTermCount: ontology.dict.otherTerms.length,
      })
    )

    const rdfImport: StatementStructures = {
      kind: StructureKind.ImportDeclaration,
      moduleSpecifier: "@ontologies/core",
      namedImports: [
        {
          name: "createNS"
        }
      ]
    };

    const nsCommentText = `Function to create arbitrary terms within the '${ontology.info.name}' ontology`
    const ns: StatementStructures = {
      kind: StructureKind.VariableStatement,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          kind: StructureKind.VariableDeclaration,
          name: "ns",
          initializer: `createNS("${ontology.info.ns}")`,
        }
      ],
      isExported: true,
      leadingTrivia: `/** ${nsCommentText} */\n`
    }

    const structureForTerm = (term: OntologyTerm): StatementStructures => ({
      kind: StructureKind.VariableStatement,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          kind: StructureKind.VariableDeclaration,
          name: safeTermSymbol(term.term),
          initializer: `/*#__PURE__*/ ns("${term.term}")`,
        }
      ],
      leadingTrivia: (term.comment && term.comment[0])
        ? `/** ${term.comment[0].value} */\n`
        : undefined,
      isExported: true
    })

    const classes = ontology.dict.classes.map(structureForTerm)
    const properties = ontology.dict.properties.map(structureForTerm)
    const otherTerms = ontology.dict.otherTerms.map(structureForTerm)

    packages.createSourceFile(
      packageTSIndexFile(ontology),
      {
        statements: [
          rdfImport,
          "\n\n",
          ns,
          "\n\n/* Classes */\n",
          ...classes,
          "\n\n/* Properties */\n",
          ...properties,
          "\n\n/* Other terms */\n",
          ...otherTerms,
        ]
      }
    )
  }

  await packages.save()

  return ontologies
}
