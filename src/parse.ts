import { doc } from '@rdfdev/iri';
import * as  fs from "fs";
import glob from "glob";
import { RDFStore, Schema, SomeNode } from 'link-lib';
import * as N3 from "n3";
import * as path from "path";
import { IndexedFormula, parse as rdfLibParse } from "rdflib";

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
  Dictionary,
  OntologyClass,
  OntologyInfo, OntologyItem,
  OntologyProperty,
  OntologyTerm, Package,
} from './types';

const rdf = createNS("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
const rdfs = createNS("http://www.w3.org/2000/01/rdf-schema#")
const owl = createNS("http://www.w3.org/2002/07/owl#")
const dce = createNS("http://purl.org/dc/elements/1.1/")
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

const isInNamespaceButNotIdentity = (node: Node, ns: string): boolean =>
  node.value.startsWith(ns) && node.value !== ns

const filterUnique = <U>(value: U, index: number, self: U[]) => {
  const selfIndex = self.findIndex((s: U) =>
    rdfFactory.equals(s as unknown as Quad, value as unknown as Quad))

  return selfIndex === index
}

const parseWithRdflib = (ontologyFile: string, info: OntologyInfo): Promise<Quad[]> => {
  const ontology = new IndexedFormula();
  ontology.rdfFactory = rdfFactory;
  const fileType = info.ontologyType;

  return new Promise<Quad[]>((resolve) => {
    rdfLibParse(ontologyFile, ontology, info.ns, fileType, () => {
      resolve(ontology.statements.map((s) => rdfFactory.quad(s.subject, s.predicate, s.object)));
    })
  });
}

const parseWithN3 = (ontologyFile: string): Quad[] => {
  return new N3.Parser()
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
};

const parseOntology = async (info: OntologyInfo): Promise<Quad[]> => {
  const file = info.ontologyFile ?? "ontology.ttl";
  const fileType = info.ontologyType ?? "text/turtle";
  const ontologyFile = fs.readFileSync(path.resolve(info.path, `../${file}`), "utf8");

  if (fileType === "text/turtle") {
    return parseWithN3(ontologyFile);
  } else {
    return parseWithRdflib(ontologyFile, info);
  }
};

function uniqueResourcesOfType(
  ontologyData: Quad[],
  ontologyInfo: OntologyInfo,
  types: Node[],
): Node[] {
  const schema = new Schema(new RDFStore());
  schema.addQuads(ontologyData);

  return ontologyData
    .filter((st) => {
      if (isInNamespaceButNotIdentity(st.subject, ontologyInfo.ns) && rdfFactory.equals(st.predicate, rdf("type"))) {
        return types.some((type) => schema.isInstanceOf(rdfFactory.id(st.subject), rdfFactory.id(type)));
      }
      return false;
    })
    .map((s) => s.subject)
    .filter(filterUnique);
}

const getProperty = (ontologyData: Quad[]) => (subject: Node, prop: NamedNode): SomeTerm[] => {
  return ontologyData
      .filter((s) => rdfFactory.equals(s.subject, subject) && rdfFactory.equals(s.predicate, prop))
      .map((s) => s.object);
}

const getOntologyItem = (
  subject: Node,
  getProp: (s: Node, p: NamedNode) => SomeTerm[],
): OntologyItem=> ({
  iri: subject,
  label: getProp(subject, rdfs("label"))
    .concat(getProp(subject, dce("title"))),
  comment: getProp(subject, rdfs("comment"))
    .concat(getProp(subject, dce("description"))),
  isDefinedBy: getProp(subject, rdfs("isDefinedBy")),
  seeAlso: getProp(subject, rdfs("seeAlso")),
})

const getOntologyTerm = (
  subject: Node,
  ontologyInfo: OntologyInfo,
  getProp: (s: Node, p: NamedNode) => SomeTerm[]
): OntologyTerm => ({
  ...getOntologyItem(subject, getProp),
  label: getProp(subject, rdfs("label")),
  term: subject.value.substring(ontologyInfo.ns.length),
});

function getClasses(data: Quad[],  info: OntologyInfo): OntologyClass[] {
  const getProp = getProperty(data);

  return uniqueResourcesOfType(data, info, classTypes)
    .map((subject: Node) => ({
      ...getOntologyTerm(subject, info, getProp),
      subClassOf: getProp(subject, rdfs("subClassOf")).filter(term => isNamedNode(term)) as NamedNode[],
    }));
}

function getOtherTerms(data: Quad[], info: OntologyInfo): OntologyTerm[] {
  const getProp = getProperty(data)
  const schema = new Schema(new RDFStore())
  schema.addQuads(data)

  return data
    .filter((st) => {
      if (isInNamespaceButNotIdentity(st.subject, info.ns)
        && rdfFactory.equals(st.predicate, rdf("type"))
        && !isLiteral(st.object)) {
        return ![
          ...propertyTypes,
          ...classTypes
        ].some((type) => schema.isInstanceOf(rdfFactory.id(st.subject), rdfFactory.id(type)));
      }

      return false
    })
    .map((s) => s.subject)
    .filter(filterUnique)
    .map<OntologyTerm>((subject: Node) => getOntologyTerm(subject, info, getProp));
}

function getProperties(data: Quad[], info: OntologyInfo): OntologyProperty[] {
  const getProp = getProperty(data);

  return uniqueResourcesOfType(data, info, propertyTypes)
    .map((subject: Node) => ({
      ...getOntologyTerm(subject, info, getProp),
      domain: getProp(subject, rdfs("domain")).filter(term => isNamedNode(term)) as NamedNode[],
      range: getProp(subject, rdfs("range")).filter(term => isNamedNode(term)) as NamedNode[],
    }))
}

function getSelf(data: Quad[], info: OntologyInfo): OntologyItem {
  const iri = [
    rdfFactory.namedNode(info.ns),
    doc(rdfFactory.namedNode(info.ns))
  ];
  const matchesSubject = (subject: SomeNode) => iri.some((it) => rdfFactory.equals(subject, it));
  const selfData = data.filter(({ subject }) => matchesSubject(subject));

  return getOntologyItem(
    iri[0],
    (_: Node, p: NamedNode) => selfData
      .filter((q) => matchesSubject(q.subject) && rdfFactory.equals(p, q.predicate))
      .map((q) => q.object),
  );
}

function findOntologyDescriptionPaths(): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    glob("./ontologies/**/index.json", async (err: Error | null, files: string[]) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(files);
      }
    });
  });
}

const getDictionary = async (info: OntologyInfo): Promise<Dictionary> => {
  const parsed = await(parseOntology(info));

  return {
    classes: getClasses(parsed, info),
    otherTerms: getOtherTerms(parsed, info),
    properties: getProperties(parsed, info),
    self: getSelf(parsed, info),
  };
}

const collectOntologyInfos = async (): Promise<OntologyInfo[]> => (await findOntologyDescriptionPaths())
  .map((path) => [path, fs.readFileSync(path, "utf8")])
  .map(([path, file]) => ({
    ...JSON.parse(file),
    path,
  }) as OntologyInfo);

export async function parse(): Promise<Package[]> {
  const descriptions = await collectOntologyInfos();

  const packages: Package[] = [];

  for (const info of descriptions) {
    packages.push({
      info,
      dict: await getDictionary(info),
    });
  }

  return packages;
}
