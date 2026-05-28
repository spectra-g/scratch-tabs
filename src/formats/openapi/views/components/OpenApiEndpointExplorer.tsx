import React, { useMemo, useState } from "react";
import { Check, Copy, FileTerminal, Tablet } from "lucide-react";
import { useRootStore } from "../../../../stores/rootStore";
import { useWorkspaceStore } from "../../../../stores/workspaceStore";
import { Tab } from "../../../../types";
import { tabletActionService } from "../../../../services/tabletActionService";
import { buildCurlCommand } from "../../utils/curlGenerator";
import { sampleForSchemaName } from "../../utils/exampleGenerator";
import { buildRestClientRequest } from "../../utils/restClientExport";
import { buildCurlRequestImport } from "../../utils/requestArtifacts";
import { OpenApiFilters } from "../hooks/useOpenApiData";
import { OpenApiMediaContent, OpenApiOperation, OpenApiResponse, OpenApiViewModel } from "../../utils/openApiTypes";
import { OpenApiBadge } from "./OpenApiBadge";
import { OpenApiMarkdown } from "./OpenApiMarkdown";

interface OpenApiEndpointExplorerProps {
  model: OpenApiViewModel;
  operations: OpenApiOperation[];
  selected: OpenApiOperation | null;
  filters: OpenApiFilters;
  onSelect: (operation: OpenApiOperation) => void;
  onFiltersChange: (filters: OpenApiFilters) => void;
  sourceTabId: string;
  side: "left" | "right";
  onOpenSchema: (schemaName: string) => void;
}

export const OpenApiEndpointExplorer: React.FC<OpenApiEndpointExplorerProps> = ({
  model,
  operations,
  selected,
  filters,
  onSelect,
  onFiltersChange,
  sourceTabId,
  side,
  onOpenSchema,
}) => {
  const grouped = useMemo(() => {
    return operations.reduce<Record<string, OpenApiOperation[]>>((groups, operation) => {
      const tag = operation.tags[0] ?? "untagged";
      groups[tag] = [...(groups[tag] ?? []), operation];
      return groups;
    }, {});
  }, [operations]);

  const active = selected ?? operations[0] ?? null;
  const server = active?.servers[0] ?? model.servers[0];

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(300px,42%)_1fr] bg-surface">
      <div className="flex min-h-0 flex-col border-r border-base">
        <div className="space-y-2 border-b border-base p-3">
          <input
            className="w-full rounded border border-base bg-element px-2 py-1.5 text-sm text-main outline-none focus:border-primary"
            placeholder="Search endpoints, schemas, status codes"
            value={filters.query}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded border border-base bg-element px-2 py-1 text-xs text-main" value={filters.method} onChange={(event) => onFiltersChange({ ...filters, method: event.target.value })}>
              <option value="all">All methods</option>
              {Object.keys(model.operations.reduce<Record<string, true>>((acc, operation) => ({ ...acc, [operation.method]: true }), {})).map((method) => <option key={method} value={method}>{method.toUpperCase()}</option>)}
            </select>
            <select className="rounded border border-base bg-element px-2 py-1 text-xs text-main" value={filters.tag} onChange={(event) => onFiltersChange({ ...filters, tag: event.target.value })}>
              <option value="all">All tags</option>
              {model.tags.map((tag) => <option key={tag.name} value={tag.name}>{tag.name}</option>)}
            </select>
            <select className="rounded border border-base bg-element px-2 py-1 text-xs text-main" value={filters.auth} onChange={(event) => onFiltersChange({ ...filters, auth: event.target.value as OpenApiFilters["auth"] })}>
              <option value="all">Any auth</option>
              <option value="auth">Auth required</option>
              <option value="none">No auth</option>
            </select>
            <select className="rounded border border-base bg-element px-2 py-1 text-xs text-main" value={filters.deprecated} onChange={(event) => onFiltersChange({ ...filters, deprecated: event.target.value as OpenApiFilters["deprecated"] })}>
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
          {Object.entries(grouped).map(([tag, tagOperations]) => (
            <section key={tag}>
              <div className="sticky top-0 border-b border-base bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">{tag}</div>
              {tagOperations.map((operation) => (
                <button
                  key={operation.id}
                  data-testid="openapi-operation-row"
                  data-method={operation.method}
                  data-path={operation.path}
                  className={`block w-full border-b border-base px-3 py-2 text-left hover:bg-element ${active?.id === operation.id ? "bg-element" : ""}`}
                  onClick={() => onSelect(operation)}
                >
                  <div className="flex items-center gap-2">
                    <OpenApiBadge tone={operation.deprecated ? "warning" : "default"}>{operation.method.toUpperCase()}</OpenApiBadge>
                    <span className="truncate font-mono text-xs text-main">{operation.path}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-secondary">{operation.summary ?? operation.operationId ?? "No summary"}</div>
                </button>
              ))}
            </section>
          ))}
        </div>
      </div>
      <div className="min-h-0 overflow-auto p-4 custom-scrollbar">
        {active ? <EndpointDetail operation={active} model={model} serverUrl={server?.url ?? "/"} sourceTabId={sourceTabId} side={side} onOpenSchema={onOpenSchema} /> : <div className="text-sm text-secondary">No endpoint matches the current filters.</div>}
      </div>
    </div>
  );
};

const EndpointDetail: React.FC<{
  operation: OpenApiOperation;
  model: OpenApiViewModel;
  serverUrl: string;
  sourceTabId: string;
  side: "left" | "right";
  onOpenSchema: (schemaName: string) => void;
}> = ({ operation, model, serverUrl, sourceTabId, side, onOpenSchema }) => {
  const addBackgroundTab = useRootStore((state) => state.addBackgroundTab);
  const url = buildCurlRequestImport(operation, { url: serverUrl }).url;
  const curl = buildCurlCommand(operation, { url: serverUrl });
  const rest = buildRestClientRequest(operation, { url: serverUrl });
  const title = `${operation.method.toUpperCase()} ${operation.path}`;

  const openCurlInBackgroundTab = async () => {
    const workspaceId = await useWorkspaceStore.getState().ensureWorkspace();
    if (!workspaceId) return;

    const now = Date.now();
    const tab: Tab = {
      id: crypto.randomUUID(),
      title: `${title} cURL`,
      content: curl,
      language: "curl",
      languageLocked: true,
      workspaceId,
      dateCreated: now,
      lastModified: now,
      cursorPosition: { lineNumber: 1, column: 1 },
      isPinned: false,
      isTablet: false,
      tabletState: "",
      previewMode: false,
    };

    addBackgroundTab(tab, side === "right");
  };

  const openRestClientTablet = () => {
    tabletActionService.handleAction({
      targetTablet: "restclient",
      action: "new-tab",
      payload: buildCurlRequestImport(operation, { url: serverUrl }),
      source: {
        titleHint: `API: ${title}`,
        tabId: sourceTabId,
        side,
      },
    });
  };

  return (
    <div className="space-y-4" data-testid="openapi-endpoint-detail">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <OpenApiBadge>{operation.method.toUpperCase()}</OpenApiBadge>
          <h3 className="font-mono text-sm font-semibold text-main">{operation.path}</h3>
          {operation.deprecated && <OpenApiBadge tone="warning">Deprecated</OpenApiBadge>}
        </div>
        <p className="mt-2 text-sm text-main">{operation.summary ?? "No summary"}</p>
        {operation.description && (
          <div className="mt-1">
            <OpenApiMarkdown>{operation.description}</OpenApiMarkdown>
          </div>
        )}
        <div className="mt-2 font-mono text-xs text-secondary">{url}</div>
      </div>
      <Section title="Auth">
        {operation.auth.length > 0 ? operation.auth.map((auth) => <OpenApiBadge key={auth.scheme} tone="muted">{auth.scheme}{auth.scopes.length ? ` (${auth.scopes.join(", ")})` : ""}</OpenApiBadge>) : <OpenApiBadge tone="success">No auth</OpenApiBadge>}
      </Section>
      <Section title="Parameters">
        {operation.parameters.length > 0 ? (
          <table className="w-full text-xs">
            <tbody>{operation.parameters.map((parameter) => (
              <tr key={`${parameter.in}-${parameter.name}`} className="border-b border-base">
                <td className="py-1 font-mono text-main">{parameter.name}</td>
                <td className="py-1 text-secondary">{parameter.in}</td>
                <td className="py-1 text-secondary">{parameter.required ? "required" : "optional"}</td>
                <td className="py-1 text-secondary">{parameter.type ?? ""}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p className="text-xs text-secondary">No parameters.</p>}
      </Section>
      <Section title="Request Body">
        {operation.requestBody.length > 0 ? (
          <div className="w-full space-y-2">
            {operation.requestBody.map((body) => (
              <div key={body.mediaType} className="rounded border border-base bg-element p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <OpenApiBadge tone="muted">{body.mediaType}</OpenApiBadge>
                  {body.schemaRefs.length > 0 ? body.schemaRefs.map((schemaName) => (
                    <button key={schemaName} data-testid="openapi-schema-link" className="text-xs text-primary hover:underline" onClick={() => onOpenSchema(schemaName)}>
                      {schemaName}
                    </button>
                  )) : <span className="text-xs text-secondary">No named schema</span>}
                </div>
                {(body.example !== undefined || body.schema !== undefined) && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded border border-base bg-surface p-2 text-xs text-main custom-scrollbar">
                    {JSON.stringify(body.example ?? body.schema, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-secondary">No request body.</p>}
      </Section>
      <Section title="Responses">
        <ResponseExplorer
          responses={operation.responses}
          model={model}
          onOpenSchema={onOpenSchema}
        />
      </Section>
      <CopyBlock
        title="cURL"
        value={curl}
        actions={(
          <IconButton title="Open cURL in background tab" onClick={openCurlInBackgroundTab}>
            <FileTerminal size={14} />
          </IconButton>
        )}
      />
      <CopyBlock
        title="REST Client"
        value={rest}
        actions={(
          <IconButton title="Open in REST Client" onClick={openRestClientTablet}>
            <Tablet size={14} />
          </IconButton>
        )}
      />
    </div>
  );
};

const ResponseExplorer: React.FC<{
  responses: OpenApiResponse[];
  model: OpenApiViewModel;
  onOpenSchema: (schemaName: string) => void;
}> = ({ responses, model, onOpenSchema }) => {
  const [selectedStatus, setSelectedStatus] = useState(responses[0]?.status ?? "");
  const selected = responses.find((response) => response.status === selectedStatus) ?? responses[0];

  if (responses.length === 0 || !selected) {
    return <p className="text-xs text-secondary">No responses.</p>;
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {responses.map((response) => (
          <button key={response.status} data-testid={`openapi-response-status-${response.status}`} onClick={() => setSelectedStatus(response.status)}>
            <OpenApiBadge tone={response.status === selected.status ? responseTone(response.status) : "muted"}>
              {response.status}
            </OpenApiBadge>
          </button>
        ))}
      </div>
      <div className="rounded border border-base bg-element p-3">
        <div className="mb-2 text-xs text-secondary">{selected.description ?? "No description"}</div>
        {selected.content.length > 0 ? (
          <div className="space-y-2">
            {selected.content.map((content) => (
              <MediaContentPreview
                key={content.mediaType}
                content={content}
                model={model}
                onOpenSchema={onOpenSchema}
              />
            ))}
          </div>
        ) : <p className="text-xs text-secondary">No response content.</p>}
      </div>
    </div>
  );
};

const MediaContentPreview: React.FC<{
  content: OpenApiMediaContent;
  model: OpenApiViewModel;
  onOpenSchema: (schemaName: string) => void;
}> = ({ content, model, onOpenSchema }) => {
  const preview = content.example !== undefined
    ? content.example
    : content.schemaRefs[0]
      ? sampleForSchemaName(content.schemaRefs[0], model.schemas)
      : content.schema;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <OpenApiBadge tone="muted">{content.mediaType}</OpenApiBadge>
        {content.schemaRefs.length > 0 ? content.schemaRefs.map((schemaName) => (
            <button key={schemaName} data-testid="openapi-schema-link" className="text-xs text-primary hover:underline" onClick={() => onOpenSchema(schemaName)}>
            {schemaName}
          </button>
        )) : <span className="text-xs text-secondary">No named schema</span>}
      </div>
      {preview !== undefined && (
        <pre className="mt-2 max-h-48 overflow-auto rounded border border-base bg-surface p-2 text-xs text-main custom-scrollbar">
          {JSON.stringify(preview, null, 2)}
        </pre>
      )}
    </div>
  );
};

function responseTone(status: string): "success" | "warning" | "danger" | "muted" {
  if (status.startsWith("2")) return "success";
  if (status.startsWith("4") || status.startsWith("5")) return "danger";
  if (status.startsWith("3")) return "warning";
  return "muted";
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">{title}</h4>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </section>
);

const CopyBlock: React.FC<{ title: string; value: string; actions?: React.ReactNode }> = ({ title, value, actions }) => (
  <section>
    <div className="mb-2 flex items-center justify-between">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">{title}</h4>
      <div className="flex items-center gap-1">
        {actions}
        <CopyButton title={`Copy ${title}`} value={value} />
      </div>
    </div>
    <pre className="overflow-auto rounded border border-base bg-element p-3 text-xs text-main custom-scrollbar">{value}</pre>
  </section>
);

const CopyButton: React.FC<{ title: string; value: string }> = ({ title, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <IconButton title={copied ? "Copied" : title} onClick={handleCopy}>
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </IconButton>
  );
};

const IconButton: React.FC<{ title: string; onClick: () => void | Promise<void>; children: React.ReactNode }> = ({ title, onClick, children }) => (
  <button className="rounded border border-base p-1 text-secondary hover:text-main" onClick={() => void onClick()} title={title}>
    {children}
  </button>
);
