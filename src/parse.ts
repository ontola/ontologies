import * as  fs from "fs"
import { RDFStore, Schema } from 'link-lib'
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
  OntologyTerm,
} from './types'

const rdf = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
const rdfs = Namespace("http://www.w3.org/2000/01/rdf-schema#")
const owl = Namespace("http://www.w3.org/2002/07/owl#")
const classTypes: SomeNode[] = [
  rdfs("Class"),
  rdfs("Datatype"),
  rdf("List"),
  owl("Class"),
];
const propertyTypes: SomeNode[] = [
  rdf("Property"),
  owl("ObjectProperty"),
  owl("DatatypeProperty"),
];

const isInNamespaceButNotIdentity = (node: SomeNode, ns: string): boolean => node.value.startsWith(ns) && node.value !== ns

const filterUnique = <U>(value: U, index: number, self: U[]) => {
  const selfIndex = self.findIndex((s: U) =>
    PlainFactory.equals(s as unknown as Quad, value as unknown as Quad))

  return selfIndex === index
}

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
          const obj = quad.object.termType === "Literal"
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

          return new Statement(subject, predicate, obj)
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

function uniqueResourcesOfType(ontologyData: Statement[],
                               ontologyInfo: OntologyInfo,
                               types: SomeNode[]): SomeNode[] {
  const schema = new Schema(new RDFStore())
  schema.addStatements(ontologyData)

  return ontologyData
    .filter((st) => {
      if (isInNamespaceButNotIdentity(st.subject, ontologyInfo.ns) && st.predicate === rdf("type")) {
        return types.some((type) => schema.isInstanceOf(st.subject.sI, type.sI))
      }
      return false
    })
    .map((s) => s.subject)
    .filter(filterUnique)
}

const getProperty = (ontologyData: Statement[]) => (subject: SomeNode, prop: NamedNode): SomeTerm[] => {
  return ontologyData
      .filter((s) => PlainFactory.equals(s.subject, subject) && PlainFactory.equals(s.predicate, prop))
      .map((s) => s.object);
}

const getOntologyTerm = (
  subject: SomeNode,
  ontologyInfo: OntologyInfo,
  getProp: (s: SomeNode, p: NamedNode) => SomeTerm[]
): OntologyTerm => ({
  iri: subject,
  label: getProp(subject, rdfs("label")),
  comment: getProp(subject, rdfs("comment")),
  isDefinedBy: getProp(subject, rdfs("isDefinedBy")),
  seeAlso: getProp(subject, rdfs("seeAlso")),
  term: subject.value.substring(ontologyInfo.ns.length),
});

function getClasses(ontologyData: Statement[],  ontologyInfo: OntologyInfo): OntologyClass[] {
  const getProp = getProperty(ontologyData);

  return uniqueResourcesOfType(ontologyData, ontologyInfo, classTypes)
    .map((subject: SomeNode) => ({
      ...getOntologyTerm(subject, ontologyInfo, getProp),
      subClassOf: getProp(subject, rdfs("subClassOf")).filter(term => term.termType === "NamedNode") as NamedNode[],
    }))
}

function getOtherTerms(ontologyData: Statement[], ontologyInfo: OntologyInfo): OntologyTerm[] {
  const getProp = getProperty(ontologyData)
  const schema = new Schema(new RDFStore())
  schema.addStatements(ontologyData)

  return ontologyData
    .filter((st) => {
      if (isInNamespaceButNotIdentity(st.subject, ontologyInfo.ns)
        && st.predicate === rdf("type")
        && st.object.termType !== "Literal") {

        return ![...propertyTypes, ...classTypes].some((type) => schema.isInstanceOf(st.subject.sI, type.sI))
      }

      return false
    })
    .map((s) => s.subject)
    .filter(filterUnique)
    .map<OntologyTerm>((subject: SomeNode) => getOntologyTerm(subject, ontologyInfo, getProp))
}

function getProperties(ontologyData: Statement[], ontologyInfo: OntologyInfo): OntologyProperty[] {
  const getProp = getProperty(ontologyData);

  return uniqueResourcesOfType(ontologyData, ontologyInfo, propertyTypes)
    .map((subject: SomeNode) => ({
      ...getOntologyTerm(subject, ontologyInfo, getProp),
      domain: getProp(subject, rdfs("domain")).filter(term => term.termType === "NamedNode") as NamedNode[],
      range: getProp(subject, rdfs("range")).filter(term => term.termType === "NamedNode") as NamedNode[],
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
          otherTerms: getOtherTerms(ontologyData, ontologyInfo),
          properties: getProperties(ontologyData, ontologyInfo),
        };

        ontologies.push(ontology)
      }

      return resolve(ontologies)
    })
  })
}
