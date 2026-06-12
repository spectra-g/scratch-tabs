import { SqlSandboxEngine } from "../sqlSandboxTypes";

export type SqlEngineFactory = () => SqlSandboxEngine;

export function createSqlEngine(): SqlSandboxEngine {
  let engine: SqlSandboxEngine | null = null;

  const getEngine = () => {
    if (!engine) {
      throw new Error("SQL engine is not initialized");
    }
    return engine;
  };

  return {
    async init() {
      const { DuckDbSandboxEngine } = await import("./DuckDbSandboxEngine");
      engine = new DuckDbSandboxEngine();
      await engine.init();
    },
    async registerSource(source) {
      return getEngine().registerSource(source);
    },
    async renameSource(sourceId, newTableName) {
      return getEngine().renameSource(sourceId, newTableName);
    },
    async dropSource(sourceId) {
      return getEngine().dropSource(sourceId);
    },
    async execute(sql) {
      return getEngine().execute(sql);
    },
    async getSchema() {
      return getEngine().getSchema();
    },
    async exportResult(result, format) {
      return getEngine().exportResult(result, format);
    },
    async reset() {
      await getEngine().reset();
    },
    async dispose() {
      if (engine) {
        await engine.dispose();
        engine = null;
      }
    },
  };
}
