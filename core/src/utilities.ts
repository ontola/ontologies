import { BlankNode, Literal, NamedNode, Node, Quad, SomeTerm, Term, TermType } from "./types";

export function isTerm(obj: any): obj is Term {
  return typeof obj === "object" && obj !== null && "termType" in obj;
}

export function isNamedNode(obj: any): obj is NamedNode {
  return isTerm(obj) && obj.termType === TermType.NamedNode;
}

export function isBlankNode(obj: any): obj is BlankNode {
  return isTerm(obj) && obj.termType === TermType.BlankNode;
}

export function isLiteral(obj: any): obj is Literal {
  return isTerm(obj) && obj.termType === TermType.Literal;
}

const TermTypes = [
  TermType.NamedNode.toString(),
  TermType.BlankNode.toString(),
  TermType.Literal.toString()
];
export function isSomeTerm(obj: any): obj is SomeTerm {
  return isTerm(obj) && TermTypes.includes(obj.termType) === true
}

const NodeTypes = [TermType.NamedNode.toString(), TermType.BlankNode.toString()];

export function isNode(obj: any): obj is Node {
  return isTerm(obj) && NodeTypes.includes(obj.termType) === true;
}

export function isQuad(obj: any): obj is Quad {
  return typeof obj === "object" && obj !== null && "subject" in obj;
}

export function doc (node: NamedNode) {
  if (node.value.indexOf('#') < 0) {
    return node.value;
  } else {
    return node.value.split('#')[0];
  }
}
