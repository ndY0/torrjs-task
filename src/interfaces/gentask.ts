import { GenServer } from "torrjs-core/src/interfaces/genserver";
import { ChildSpec } from "torrjs-core/src/supervision/types";
import { TaskSpec, TaskRestartStrategy } from "../supervision/types";

abstract class GenTask extends GenServer {
  protected async *taskSpec(): AsyncGenerator<void, TaskSpec, unknown> {
    return {
      restart: TaskRestartStrategy.TEMPORARY,
      shutdown: 10_000,
    };
  }
  public async *childSpec(): AsyncGenerator<void, ChildSpec, unknown> {
    const spec = yield* this.taskSpec();
    return <ChildSpec>(<unknown>spec);
  }
}

export { GenTask };
