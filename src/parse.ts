import * as  fs from "fs"
import * as path from 'path'

import glob from "glob"
import {
  parse as parseRDF,
  IndexedFormula,
  Namespace,
  SomeTerm,
  Statement,
  NamedNode,
} from 'rdflib'
import {
  Ontology,
  OntologyClass,
  OntologyInfo,
  OntologyProperty,
} from './types'

const rdf = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
const rdfs = Namespace("http://www.w3.org/2000/01/rdf-schema#")
const owl = Namespace("http://www.w3.org/2002/07/owl#")
const classTypes: SomeTerm[] = [
  rdfs("Class"),
  owl("Class"),
];
const propertyTypes: SomeTerm[] = [
  rdf("Property"),
  owl("ObjectProperty"),
];

function parseOntology(file: string, ontologyInfo: OntologyInfo): Promise<IndexedFormula> {
  return new Promise((resolve) => {
    const ontology = new IndexedFormula()

    parseRDF(file, ontology, ontologyInfo.ns, "text/turtle", () => {
      resolve(ontology)
    })
  })
}

function getClasses(ontologyData: IndexedFormula,  ontologyInfo: OntologyInfo): OntologyClass[] {
  const getProperty = (st: Statement, prop: NamedNode): SomeTerm[] =>
    ontologyData.match(st.subject, prop).map(s => s.object);

  return ontologyData
    .statements
    .filter((st) => st.predicate === rdf("type") && classTypes.includes(st.object))
    .map((property) => ({
      iri: property.subject,
      label: getProperty(property, rdfs("label")),
      comment: getProperty(property, rdfs("comment")),
      isDefinedBy: getProperty(property, rdfs("isDefinedBy")),
      seeAlso: getProperty(property, rdfs("seeAlso")),
      subClassOf: getProperty(property, rdfs("subClassOf")).filter(term => term.termType === "NamedNode") as NamedNode[],
      term: property.subject.value.substring(ontologyInfo.ns.length),
    }))
}

function getProperties(ontologyData: IndexedFormula, ontologyInfo: OntologyInfo): OntologyProperty[] {
  const getProperty = (st: Statement, prop: NamedNode): SomeTerm[] =>
    ontologyData.match(st.subject, prop).map(s => s.object);

  return ontologyData
    .statements
    .filter((st) => st.predicate === rdf("type") && propertyTypes.includes(st.object))
    .map((property) => ({
      iri: property.subject,
      label: getProperty(property, rdfs("label")),
      comment: getProperty(property, rdfs("comment")),
      isDefinedBy: getProperty(property, rdfs("isDefinedBy")),
      seeAlso: getProperty(property, rdfs("seeAlso")),
      domain: getProperty(property, rdfs("domain")).filter(term => term.termType === "NamedNode") as NamedNode[],
      term: property.subject.value.substring(ontologyInfo.ns.length),
      range: getProperty(property, rdfs("range")).filter(term => term.termType === "NamedNode") as NamedNode[],
    }))
}

export function parse(): Promise<Ontology[]> {
  return new Promise(async (resolve, reject) => {
    glob("./ontologies/**/index.json", async (err: Error | null, files: string[]) => {
      if (err) {
        return reject(err)
      }

      const ontologies: Ontology[] = []

      for (const file of files) {
        const infoFile = fs.readFileSync(file, "utf8")
        const ontologyInfo = JSON.parse(infoFile) as OntologyInfo;
        const ontologyFile = fs.readFileSync(path.resolve(file, '../ontology.ttl'), "utf8")

        const ontologyData = await parseOntology(ontologyFile, ontologyInfo)

        const ontology = {
          name: ontologyInfo.name,
          ns: new NamedNode(ontologyInfo.ns),
          symbol: ontologyInfo.symbol,
          classes: getClasses(ontologyData, ontologyInfo),
          properties: getProperties(ontologyData, ontologyInfo),
        };

        ontologies.push(ontology)
      }

      return resolve(ontologies)
    })
  })
}
