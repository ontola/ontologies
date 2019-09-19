import * as  fs from "fs"
import * as path from "path"

import glob from "glob"
import * as N3 from "n3"
import {
  parse as parseRDF,
  IndexedFormula,
  Namespace,
  SomeTerm,
  NamedNode,
  SomeNode,
  Statement,
  BlankNode,
  Literal,
} from 'rdflib'

import { PlainFactory, Quad } from "../core"

import {
  Ontology,
  OntologyClass,
  OntologyInfo,
  OntologyProperty,
} from "./types"

const rdf = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
const rdfs = Namespace("http://www.w3.org/2000/01/rdf-schema#")
const owl = Namespace("http://www.w3.org/2002/07/owl#")
const classTypes: SomeNode[] = [
  rdfs("Class"),
  owl("Class"),
];
const propertyTypes: SomeNode[] = [
  rdf("Property"),
  owl("ObjectProperty"),
];

function parseOntology(packageFile: string, ontologyInfo: OntologyInfo): Promise<Statement[]> {
  return new Promise((resolve) => {
    const file = ontologyInfo.ontologyFile || "ontology.ttl"
    const fileType = ontologyInfo.ontologyType || "text/turtle"
    const ontologyFile = fs.readFileSync(path.resolve(packageFile, `../${file}`), "utf8")

    if (fileType === "text/turtle") {
      const statements = new N3.Parser()
        .parse(ontologyFile)
        .map((quad) => {
          const subject = quad.subject.termType === "NamedNode"
            ? new NamedNode(quad.subject.value)
            : new BlankNode(quad.subject.value)
          const predicate = new NamedNode(quad.predicate.value)
          const object = quad.object.termType === "Literal"
            ? new Literal(
              quad.object.value,
              quad.object.language,
              quad.object.datatype
                ? new NamedNode(quad.object.datatype.value)
                : undefined
            )
            : quad.object.termType === "NamedNode"
              ? new NamedNode(quad.object.value)
              : new BlankNode(quad.object.value)

          return new Statement(subject, predicate, object)
        })
      resolve(statements)
    } else {
      const ontology = new IndexedFormula()
      parseRDF(ontologyFile, ontology, ontologyInfo.ns, fileType, () => {
        resolve(ontology.statements)
      })
    }
  })
}

function uniqueResourcesOfType(ontologyData: Statement[], types: SomeNode[]): SomeNode[] {
  return ontologyData
    .filter((st) => st.predicate === rdf("type") && types.includes(st.object as SomeNode))
    .map((s) => s.subject)
    .filter((value, index, self) => self.findIndex((s) => PlainFactory.equals(s as unknown as Quad, value as unknown as Quad)) === index)
}

function getClasses(ontologyData: Statement[],  ontologyInfo: OntologyInfo): OntologyClass[] {
  const getProperty = (subject: SomeNode, prop: NamedNode): SomeTerm[] =>
    ontologyData
      .filter((s) => PlainFactory.equals(s.subject, subject) && PlainFactory.equals(s.predicate, prop))
      .map(s => s.object);

  return uniqueResourcesOfType(ontologyData, classTypes)
    .map((subject: SomeNode) => ({
      iri: subject,
      label: getProperty(subject, rdfs("label")),
      comment: getProperty(subject, rdfs("comment")),
      isDefinedBy: getProperty(subject, rdfs("isDefinedBy")),
      seeAlso: getProperty(subject, rdfs("seeAlso")),
      subClassOf: getProperty(subject, rdfs("subClassOf")).filter(term => term.termType === "NamedNode") as NamedNode[],
      term: subject.value.substring(ontologyInfo.ns.length),
    }))
}

function getProperties(ontologyData: Statement[], ontologyInfo: OntologyInfo): OntologyProperty[] {
  const getProperty = (subject: SomeNode, prop: NamedNode): SomeTerm[] =>
    ontologyData
      .filter((s) => PlainFactory.equals(s.subject, subject) && PlainFactory.equals(s.predicate, prop))
      .map(s => s.object);

  return uniqueResourcesOfType(ontologyData, propertyTypes)
    .map((subject: SomeNode) => ({
      iri: subject,
      label: getProperty(subject, rdfs("label")),
      comment: getProperty(subject, rdfs("comment")),
      isDefinedBy: getProperty(subject, rdfs("isDefinedBy")),
      seeAlso: getProperty(subject, rdfs("seeAlso")),
      domain: getProperty(subject, rdfs("domain")).filter(term => term.termType === "NamedNode") as NamedNode[],
      term: subject.value.substring(ontologyInfo.ns.length),
      range: getProperty(subject, rdfs("range")).filter(term => term.termType === "NamedNode") as NamedNode[],
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

        const ontologyData = await parseOntology(file, ontologyInfo)

        const ontology = {
          name: ontologyInfo.name,
          ns: new NamedNode(ontologyInfo.ns),
          source: ontologyInfo.source,
          lov: ontologyInfo.lov,
          spec: ontologyInfo.spec,
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
