import {
  ChildRestartStrategy,
  RestartStrategy,
} from "torrjs-core/src/supervision/types";
import { GenTask } from "../interfaces/gentask";

enum TaskRestartStrategy {
  TEMPORARY = ChildRestartStrategy.TEMPORARY,
}

type JobSpec = {
  childStrategy: RestartStrategy;
  supervise: typeof GenTask[];
};

type TaskSpec = {
  startArgs?: any[];
  restart: TaskRestartStrategy;
  shutdown?: number;
};

type CronTime = Date | moment.Moment;

export { TaskSpec, JobSpec, TaskRestartStrategy, CronTime };
