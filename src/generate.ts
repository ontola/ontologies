import { Project, StatementStructures, StructureKind, ts, VariableDeclarationKind } from 'ts-morph'
import { ScriptTarget } from 'typescript/lib/tsserverlibrary'
import defaults from './defaults.package.json'
import { packageTSIndexFile } from './helpers'
import { Ontology, OntologyItem, OntologyItemPropType } from './types'

// From https://github.com/jonschlinkert/reserved/blob/master/index.js
const RESERVED_KEYWORDS = [
  'abstract',
  'arguments',
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

  'Array',
  'Date',
  'eval',
  'function',
  'hasOwnProperty',
  'Infinity',
  'isFinite',
  'isNaN',
  'isPrototypeOf',
  'length',
  'Math',
  'name',
  'NaN',
  'Number',
  'Object',
  'prototype',
  'String',
  'toString',
  'undefined',
  'valueOf'
]

const firstValue = (obj: OntologyItem, property: string): OntologyItemPropType => {
  if (obj && Object.prototype.hasOwnProperty.call(obj, property)) {
    const prop = obj[property]

    return Array.isArray(prop) ? prop[0] : prop
  }

  return undefined
}

export async function generate(ontologies: Ontology[]): Promise<Ontology[]> {
  const packages = new Project()

  for (const ontology of ontologies) {
    const safeTermSymbol = (term: string) => {
      if (RESERVED_KEYWORDS.includes(term)) {
        return `${ontology.symbol}${term}`
      }

      return term
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
      isExported: true
    }

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
      isExported: false
    }))

    const propertyShorthands = ontology
      .properties
      .map((property) => ts.createShorthandPropertyAssignment(safeTermSymbol(property.term)))

    const defaultExport = ts.createExportDefault(ts.createObjectLiteral(propertyShorthands, true))

    const printer = ts.createPrinter({
      omitTrailingSemicolon: false,
    });

    const result = printer.printNode(
      ts.EmitHint.Unspecified,
      defaultExport,
      ts.createSourceFile("", "", ScriptTarget.ES2019)
    );

    packages.createSourceFile(
      packageTSIndexFile(ontology),
      {
        statements: [
          rdfImport,
          "\n",
          ns,
          "\n",
          ...properties,
          "\n",
          result
        ]
      }
    )
  }

  await packages.save()

  return ontologies
}
