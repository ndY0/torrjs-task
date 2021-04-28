import { GenApplication } from "torrjs-core/src/interfaces/genapplication";
import { JobSpec } from "../supervision/types";

abstract class GenJob extends GenApplication {
  constructor(spec: JobSpec) {
    super(spec);
  }
}

export { GenJob };
