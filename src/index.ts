import { compile } from './compile'
import { generate } from './generate'
import { parse } from "./parse"

console.log("Starting process")
parse()
  .then(generate)
  .then(compile);
