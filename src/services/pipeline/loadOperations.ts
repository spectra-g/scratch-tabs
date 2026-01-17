/**
 * Pipeline Operations Loader
 *
 * This file eagerly imports all pipeline operations to ensure they're
 * registered in the registry before the Pipeline UI opens.
 *
 * Import this file in the PipelineEditorModal to trigger registration.
 */

// Import core categories (already imported in init.ts)
import "./categories";

// Import format operations
import "../../formats/json/pipelineOperations";

// Import tablet operations
import "../../tablets/base64/pipelineOperations";

// Import batch tools operations (text transformations)
import "../../components/BatchTools/pipelineOperations";

// Future: Add more format/tablet operations here as they're created
// import "../../formats/xml/pipelineOperations";
// import "../../formats/csv/pipelineOperations";
// import "../../tablets/checksum/pipelineOperations";
// import "../../tablets/jwt/pipelineOperations";

// Log registration status in development
if (import.meta.env.DEV) {
  import("./OperationRegistry").then(({ operationRegistry }) => {});
}

export {};
