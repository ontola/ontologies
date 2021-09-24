import "./useFactory";

import { compile } from "./compile"
import { generate } from "./generate"
import { parse } from "./parse"
import { publish } from "./publish"

const stepWithLog = (func: ((...args: any[]) => any), message: string) => (...args: any[]) => {
  console.log(message);
  return func(...args);
}

console.log("Starting parse")
parse()
  .then(stepWithLog(generate, "Starting generate"))
  .then(stepWithLog(compile, "Starting compile"))
  .then(stepWithLog(publish, "Starting publish"))
  .then(() => console.log("Done"));
