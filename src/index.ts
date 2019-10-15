import "./useFactory";

import { compile } from "./compile"
import { generate } from "./generate"
import { parse } from "./parse"
import { publish } from "./publish"

console.log("Starting process")
parse()
  .then(generate)
  .then(compile)
  .then(publish);
