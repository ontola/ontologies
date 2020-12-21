import * as  fs from "fs"
import glob from "glob"
import { RDFStore, Schema, rdflib } from "link-lib"
import * as N3 from "n3"
import * as path from "path"

import rdfFactory, {
  createNS,
  NamedNode,
  Node,
  Quad,
  SomeTerm,
  isNamedNode,
  isLiteral,
} from "@ontologies/core";
import {
  Ontology,
  OntologyClass,
  OntologyInfo,
  OntologyProperty,
  OntologyTerm,
} from "./types"

const rdf = createNS("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
const rdfs = createNS("http://www.w3.org/2000/01/rdf-schema#")
const owl = createNS("http://www.w3.org/2002/07/owl#")
const classTypes: Node[] = [
  rdfs("Class"),
  rdfs("Datatype"),
  rdf("List"),
  owl("Class"),
]
const propertyTypes: Node[] = [
  rdf("Property"),
  owl("ObjectProperty"),
  owl("DatatypeProperty"),
]

const isInNamespaceButNotIdentity = (node: Node, ns: string): boolean => node.value.startsWith(ns) && node.value !== ns

const filterUnique = <U>(value: U, index: number, self: U[]) => {
  const selfIndex = self.findIndex((s: U) =>
    rdfFactory.equals(s as unknown as Quad, value as unknown as Quad))

  return selfIndex === index
}

function parseOntology(packageFile: string, ontologyInfo: OntologyInfo): Promise<Quad[]> {
  return new Promise((resolve) => {
    const file = ontologyInfo.ontologyFile || "ontology.ttl"
    const fileType = ontologyInfo.ontologyType || "text/turtle"
    const ontologyFile = fs.readFileSync(path.resolve(packageFile, `../${file}`), "utf8")

    if (fileType === "text/turtle") {
      const statements = new N3.Parser()
        .parse(ontologyFile)
        .map((quad) => {
          const subject = isNamedNode(quad.subject)
            ? rdfFactory.namedNode(quad.subject.value)
            : rdfFactory.blankNode(quad.subject.value)
          const predicate = rdfFactory.namedNode(quad.predicate.value)
          const obj = isLiteral(quad.object)
            ? rdfFactory.literal(
              quad.object.value,
              quad.object.language,
              quad.object.datatype
                ? rdfFactory.namedNode(quad.object.datatype.value)
                : undefined
            )
            : isNamedNode(quad.object)
              ? rdfFactory.namedNode(quad.object.value)
              : rdfFactory.blankNode(quad.object.value)

          return rdfFactory.quad(subject, predicate, obj)
        })
      resolve(statements)
    } else {
      const ontology = new rdflib.IndexedFormula()
      rdflib.RDFparse(ontologyFile, ontology, ontologyInfo.ns, fileType, () => {
        resolve(ontology.statements)
      })
    }
  })
}

function uniqueResourcesOfType(ontologyData: Quad[],
                               ontologyInfo: OntologyInfo,
                               types: Node[]): Node[] {
  const schema = new Schema(new RDFStore())
  schema.addStatements(ontologyData)

  return ontologyData
    .filter((st) => {
      if (isInNamespaceButNotIdentity(st.subject, ontologyInfo.ns) && rdfFactory.equals(st.predicate, rdf("type"))) {
        return types.some((type) => schema.isInstanceOf(rdfFactory.id(st.subject), rdfFactory.id(type)))
      }
      return false
    })
    .map((s) => s.subject)
    .filter(filterUnique)
}

const getProperty = (ontologyData: Quad[]) => (subject: Node, prop: NamedNode): SomeTerm[] => {
  return ontologyData
      .filter((s) => rdfFactory.equals(s.subject, subject) && rdfFactory.equals(s.predicate, prop))
      .map((s) => s.object);
}

const getOntologyTerm = (
  subject: Node,
  ontologyInfo: OntologyInfo,
  getProp: (s: Node, p: NamedNode) => SomeTerm[]
): OntologyTerm => ({
  iri: subject,
  label: getProp(subject, rdfs("label")),
  comment: getProp(subject, rdfs("comment")),
  isDefinedBy: getProp(subject, rdfs("isDefinedBy")),
  seeAlso: getProp(subject, rdfs("seeAlso")),
  term: subject.value.substring(ontologyInfo.ns.length),
});

function getClasses(ontologyData: Quad[],  ontologyInfo: OntologyInfo): OntologyClass[] {
  const getProp = getProperty(ontologyData);

  return uniqueResourcesOfType(ontologyData, ontologyInfo, classTypes)
    .map((subject: Node) => ({
      ...getOntologyTerm(subject, ontologyInfo, getProp),
      subClassOf: getProp(subject, rdfs("subClassOf")).filter(term => isNamedNode(term)) as NamedNode[],
    }))
}

function getOtherTerms(ontologyData: Quad[], ontologyInfo: OntologyInfo): OntologyTerm[] {
  const getProp = getProperty(ontologyData)
  const schema = new Schema(new RDFStore())
  schema.addStatements(ontologyData)

  return ontologyData
    .filter((st) => {
      if (isInNamespaceButNotIdentity(st.subject, ontologyInfo.ns)
        && rdfFactory.equals(st.predicate, rdf("type"))
        && !isLiteral(st.object)) {
        return ![
          ...propertyTypes,
          ...classTypes
        ].some((type) => schema.isInstanceOf(rdfFactory.id(st.subject), rdfFactory.id(type)))
      }

      return false
    })
    .map((s) => s.subject)
    .filter(filterUnique)
    .map<OntologyTerm>((subject: Node) => getOntologyTerm(subject, ontologyInfo, getProp))
}

function getProperties(ontologyData: Quad[], ontologyInfo: OntologyInfo): OntologyProperty[] {
  const getProp = getProperty(ontologyData);

  return uniqueResourcesOfType(ontologyData, ontologyInfo, propertyTypes)
    .map((subject: Node) => ({
      ...getOntologyTerm(subject, ontologyInfo, getProp),
      domain: getProp(subject, rdfs("domain")).filter(term => isNamedNode(term)) as NamedNode[],
      range: getProp(subject, rdfs("range")).filter(term => isNamedNode(term)) as NamedNode[],
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
          ns: rdfFactory.namedNode(ontologyInfo.ns),
          source: ontologyInfo.source,
          lov: ontologyInfo.lov,
          spec: ontologyInfo.spec,
          symbol: ontologyInfo.symbol,
          classes: getClasses(ontologyData, ontologyInfo),
          otherTerms: getOtherTerms(ontologyData, ontologyInfo),
          properties: getProperties(ontologyData, ontologyInfo),
          version: ontologyInfo.version,
        };

        ontologies.push(ontology)
      }

      return resolve(ontologies)
    })
  })
}
