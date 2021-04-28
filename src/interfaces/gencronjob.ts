import { CronJob } from "cron";
import { GenDynamicSupervisor } from "torrjs-core/src/interfaces/gendynamicsupervisor";
import { GenServer } from "torrjs-core/src/interfaces/genserver";
import { GenTask } from "./gentask";
import { CronTime } from "../supervision/types";
import EventEmitter from "events";
import { keyForIdSymbol } from "torrjs-core/src/utils/symbols";
import { ChildSpec, RestartStrategy } from "torrjs-core/src/supervision/types";
import { tail, memo, getMemoValue } from "torrjs-core/src/utils";
import { supervise } from "torrjs-core/src/supervision";

abstract class GenCronJob extends GenDynamicSupervisor {
  protected abstract cronChildren(): AsyncGenerator<
    unknown,
    [typeof GenTask & (new () => GenTask), CronTime][],
    unknown
  >;
  protected async *children(): AsyncGenerator<unknown, any, unknown> {
    return yield* this.cronChildren();
  }
  protected async *run<
    U extends typeof GenServer,
    V extends typeof GenServer & (new () => GenServer)
  >(
    canceler: Generator<[boolean, EventEmitter], never, boolean>,
    cancelerPromise: Promise<boolean>,
    context: U,
    supervised: {
      id: string | null;
      canceler: Generator<[boolean, EventEmitter], never, boolean>;
    }[],
    {
      strategy,
      childSpecs,
    }: {
      childSpecs: [
        typeof GenServer & (new () => GenServer),
        GenServer,
        ChildSpec,
        Generator<[boolean, EventEmitter], never, boolean>
      ][];
      strategy: RestartStrategy;
    }
  ): AsyncGenerator<
    any,
    {
      strategy: RestartStrategy;
      childSpecs: [
        typeof GenServer & (new () => GenServer),
        GenServer,
        ChildSpec,
        Generator<[boolean, EventEmitter], never, boolean>
      ][];
    },
    any
  > {
    const job = new CronJob(
      "* * * * *",
      function () {},
      function () {},
      false,
      undefined,
      this,
      false,
      undefined,
      true
    );
    if (getMemoValue(canceler)) {
      const children = (yield* this.cronChildren()).map(([Child, cronTime]) => [
        Child,
        new (<any>Child)(),
        cronTime,
      ]);
      const childSpecs: [
        typeof GenTask,
        GenTask,
        ChildSpec,
        Generator<[boolean, EventEmitter], never, boolean>,
        CronTime
      ][] = [];
      for (const [Child, child] of children) {
        childSpecs.push([
          Child,
          child[0],
          yield* child.childSpec(),
          memo(true),
          child[1],
        ]);
      }
      const completionPromises: Promise<void>[] = [];
      const cronjobs: CronJob[] = [];
      for (const spec of childSpecs) {
        supervised.push({
          id: spec[1][keyForIdSymbol],
          canceler: spec[3],
        });
        completionPromises.push(
          new Promise((resolve) => {
            cronjobs.push(
              new CronJob(
                spec[4],
                function () {
                  tail(
                    () =>
                      supervise(
                        [
                          <
                            [
                              typeof GenServer,
                              GenServer,
                              ChildSpec,
                              Generator<[boolean, EventEmitter], never, boolean>
                            ]
                          >(<unknown>spec),
                        ],
                        strategy,
                        canceler,
                        cancelerPromise,
                        supervised.slice(
                          supervised.length - 1,
                          supervised.length
                        )
                      ),
                    canceler,
                    null
                  );
                },
                function () {
                  resolve();
                },
                true,
                undefined,
                this,
                false,
                undefined,
                true
              )
            );
          })
        );
        cancelerPromise.then((_) => {
          cronjobs.forEach((job) => job.stop());
        });
        await Promise.all(completionPromises);
      }
      return {
        strategy,
        childSpecs: <any>childSpecs,
      };
    } else {
      return {
        strategy,
        childSpecs: [],
      };
    }
  }
}

export { GenCronJob };
