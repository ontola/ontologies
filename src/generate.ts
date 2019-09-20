import * as fs from "fs"
import Handlebars from "handlebars"
import {
  Project,
  StatementStructures,
  StructureKind,
  ts,
  VariableDeclarationKind,
} from 'ts-morph'
import { ScriptTarget } from "typescript/lib/tsserverlibrary"

import defaults from "../templates/defaults.package.json"
import { packageTSIndexFile } from "./helpers"
import { Ontology, OntologyItem, OntologyItemPropType } from "./types"

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
  'prototype',
  'undefined',
  'valueOf',
]

const UNSAFE_TOKENS = ['-']

const firstValue = (obj: OntologyItem, property: string): OntologyItemPropType => {
  if (obj && Object.prototype.hasOwnProperty.call(obj, property)) {
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
      leadingTrivia: `/** Function to create arbitrary terms within the '${ontology.name}' */\n`
    }

    const classes = ontology.classes.map((klass): StatementStructures => ({
      kind: StructureKind.VariableStatement,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          kind: StructureKind.VariableDeclaration,
          name: safeTermSymbol(klass.term),
          initializer: `ns("${klass.term}")`,
        }
      ],
      leadingTrivia: (klass.comment && klass.comment[0])
        ? `/** ${klass.comment[0]} */\n`
        : undefined,
      isExported: true
    }))

    const properties = ontology.properties.map((property): StatementStructures => ({
        kind: StructureKind.VariableStatement,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            kind: StructureKind.VariableDeclaration,
            name: safeTermSymbol(property.term),
            initializer: `ns("${property.term}")`,
          }
        ],
        leadingTrivia: (property.comment && property.comment[0])
          ? `/** ${property.comment[0]} */\n`
          : undefined,
        isExported: true
      }))

    const defaultExportSymbols: Array<ts.ShorthandPropertyAssignment | ts.PropertyAssignment> = [
      ts.createShorthandPropertyAssignment('ns'),
      ...[...ontology.classes, ...ontology.properties]
        .flatMap<ts.PropertyAssignment | ts.ShorthandPropertyAssignment>((property) => {
          const safeTerm = safeTermSymbol(property.term)
          if (safeTerm !== property.term) {
            const nonValidIdentifier = UNSAFE_TOKENS.some((token) => property.term.includes(token))

            const exactPropertyName = nonValidIdentifier
              ? ts.createComputedPropertyName(ts.createLiteral(property.term))
              : property.term

            const validIndentifierPropertyName = nonValidIdentifier
              ? ts.createPropertyAssignment(safeTerm, ts.createIdentifier(safeTerm))
              : undefined

            return [
              validIndentifierPropertyName,
              ts.createPropertyAssignment(exactPropertyName, ts.createIdentifier(safeTerm)),
            ].filter(Boolean) as Array<ts.PropertyAssignment | ts.ShorthandPropertyAssignment>
          }

          return ts.createShorthandPropertyAssignment(safeTerm)
        })
    ]

    const defaultExport = ts.createExportDefault(ts.createObjectLiteral(defaultExportSymbols, true))

    const printer = ts.createPrinter({
      omitTrailingSemicolon: false,
    })

    const defaultExportPrintedNode = printer.printNode(
      ts.EmitHint.Unspecified,
      defaultExport,
      ts.createSourceFile("", "", ScriptTarget.ES2019)
    )

    packages.createSourceFile(
      packageTSIndexFile(ontology),
      {
        statements: [
          rdfImport,
          "\n",
          ns,
          "\n",
          ...classes,
          "\n",
          ...properties,
          "\n",
          defaultExportPrintedNode
        ]
      }
    )
  }

  await packages.save()

  return ontologies
}
