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
  Ontology,
  OntologyItem,
  OntologyItemPropType,
  OntologyTerm,
} from './types'

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

const firstValue = (obj: OntologyItem, property: string): OntologyItemPropType => {
  if (typeof obj === "object" && obj !== null && property in obj) {
    const prop = obj[property]

    return Array.isArray(prop) ? prop[0] : prop
  }

  return undefined
}

export async function generate(ontologies: Ontology[]): Promise<Ontology[]> {
  const packages = new Project()

  const readmeTemplate = Handlebars.compile(fs.readFileSync("./templates/readme.template.md").toString('utf-8'))

  for (const ontology of ontologies) {
    const safeTermSymbol = (term: string) => {
      if (RESERVED_KEYWORDS.includes(term)) {
        return `${ontology.symbol}${term.replace('-', '_')}`
      }

      return term.replace('-', '_')
    }

    const packageJSON = Object.assign(
      {},
      defaults,
      {
        name: `@ontologies/${ontology.symbol}`,
        description: firstValue(ontology, 'label'),
        version: ontology.version || defaults.version
      }
    )
    packages.createSourceFile(
      `packages/${ontology.symbol}/package.json`,
      JSON.stringify(packageJSON, null, 2)
    )

    packages.createSourceFile(
      `packages/${ontology.symbol}/README.md`,
      readmeTemplate({
        ...ontology,
        ...packageJSON,
        humanName: ontology.name,
        ontologiesRepo: 'https://github.com/ontola/ontologies',
        ns: ontology.ns.value,
        termCount: ontology.classes.length + ontology.properties.length + ontology.otherTerms.length,
        classCount: ontology.classes.length,
        propertyCount: ontology.properties.length,
        otherTermCount: ontology.otherTerms.length,
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

    const nsCommentText = `Function to create arbitrary terms within the '${ontology.name}' ontology`
    const ns: StatementStructures = {
      kind: StructureKind.VariableStatement,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          kind: StructureKind.VariableDeclaration,
          name: "ns",
          initializer: `createNS("${ontology.ns.value}")`,
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

    const classes = ontology.classes.map(structureForTerm)
    const properties = ontology.properties.map(structureForTerm)
    const otherTerms = ontology.otherTerms.map(structureForTerm)

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
