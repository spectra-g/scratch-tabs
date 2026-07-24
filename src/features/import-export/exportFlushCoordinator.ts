import { canvasLifecycleCoordinator } from "../../services/canvasLifecycleCoordinator";
import { usePersistenceStore } from "../../stores/persistenceStore";

export interface ExportFlushCoordinator {
  flush(): Promise<void>;
}

export class WorkspaceExportFlushCoordinator implements ExportFlushCoordinator {
  async flush(): Promise<void> {
    await canvasLifecycleCoordinator.flushActiveDocuments();
    await usePersistenceStore.getState().saveState();
  }
}

export const workspaceExportFlushCoordinator =
  new WorkspaceExportFlushCoordinator();
