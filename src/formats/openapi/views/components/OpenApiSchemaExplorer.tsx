import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { OpenApiSchema } from "../../utils/openApiTypes";
import { sampleForSchema } from "../../utils/exampleGenerator";
import { OpenApiBadge } from "./OpenApiBadge";
import { OpenApiMarkdown } from "./OpenApiMarkdown";

interface OpenApiSchemaExplorerProps {
  schemas: OpenApiSchema[];
  selectedSchemaName?: string | null;
}

function typeScriptTypeForProperty(property: OpenApiSchema["properties"][number]): string {
  if (property.enumValues?.length) {
    return property.enumValues.map((value) => JSON.stringify(value)).join(" | ");
  }
  if (property.ref) return property.ref;
  if (property.type === "array") {
    const itemType = property.itemsRef ?? (property.itemsType === "integer" ? "number" : property.itemsType) ?? "unknown";
    return `${itemType}[]`;
  }
  if (property.type === "integer" || property.type === "number") return "number";
  if (property.type === "object") return "Record<string, unknown>";
  return property.type ?? "unknown";
}

function displayTypeForProperty(property: OpenApiSchema["properties"][number]): string {
  if (property.type === "array") {
    return `array<${property.itemsRef ?? property.itemsType ?? "unknown"}>`;
  }
  return property.ref ?? property.type ?? "unknown";
}

function typeScriptForSchema(schema: OpenApiSchema): string {
  const lines = [`interface ${schema.name.replace(/[^A-Za-z0-9_$]/g, "") || "Generated"} {`];
  schema.properties.forEach((property) => {
    const optional = property.required ? "" : "?";
    lines.push(`  ${property.name}${optional}: ${typeScriptTypeForProperty(property)};`);
  });
  lines.push("}");
  return lines.join("\n");
}

export const OpenApiSchemaExplorer: React.FC<OpenApiSchemaExplorerProps> = ({ schemas, selectedSchemaName }) => {
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(schemas[0]?.name ?? null);
  const filtered = useMemo(
    () => schemas.filter((schema) => schema.name.toLowerCase().includes(query.toLowerCase())),
    [query, schemas],
  );
  const selected = schemas.find((schema) => schema.name === selectedName) ?? filtered[0] ?? null;

  useEffect(() => {
    if (selectedSchemaName && schemas.some((schema) => schema.name === selectedSchemaName)) {
      setSelectedName(selectedSchemaName);
      setQuery("");
    }
  }, [schemas, selectedSchemaName]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[280px_1fr] bg-surface" data-testid="openapi-schema-explorer">
      <div className="flex min-h-0 flex-col border-r border-base">
        <div className="border-b border-base p-3">
          <input className="w-full rounded border border-base bg-element px-2 py-1.5 text-sm text-main outline-none focus:border-primary" placeholder="Search schemas" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
          {filtered.map((schema) => (
            <button key={schema.name} data-testid="openapi-schema-row" data-schema-name={schema.name} className={`block w-full border-b border-base px-3 py-2 text-left hover:bg-element ${selected?.name === schema.name ? "bg-element" : ""}`} onClick={() => setSelectedName(schema.name)}>
              <div className="truncate text-sm font-medium text-main">{schema.name}</div>
              <div className="mt-1 flex gap-1">
                {schema.type && <OpenApiBadge tone="muted">{schema.type}</OpenApiBadge>}
                {schema.properties.length > 0 && <OpenApiBadge tone="muted">{schema.properties.length} props</OpenApiBadge>}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 overflow-auto p-4 custom-scrollbar" data-testid="openapi-schema-detail">
        {selected ? (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-main">{selected.name}</h3>
                {selected.type && <OpenApiBadge>{selected.type}</OpenApiBadge>}
                {selected.nullable && <OpenApiBadge tone="muted">nullable</OpenApiBadge>}
                {selected.deprecated && <OpenApiBadge tone="warning">deprecated</OpenApiBadge>}
              </div>
              {selected.description && (
                <div className="mt-2">
                  <OpenApiMarkdown>{selected.description}</OpenApiMarkdown>
                </div>
              )}
            </div>
            {selected.properties.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Properties</h4>
                <div className="overflow-hidden rounded border border-base">
                  {selected.properties.map((property) => (
                    <div key={property.name} className="grid grid-cols-[1fr_120px_90px] gap-2 border-b border-base px-3 py-2 text-xs last:border-b-0">
                      <div className="min-w-0">
                        <span className="font-mono text-main">{property.name}</span>
                        {property.description && <div className="mt-1 truncate text-secondary">{property.description}</div>}
                      </div>
                      <div className="text-secondary">{displayTypeForProperty(property)}</div>
                      <div>{property.required ? <OpenApiBadge tone="warning">required</OpenApiBadge> : <OpenApiBadge tone="muted">optional</OpenApiBadge>}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {(selected.oneOf.length > 0 || selected.anyOf.length > 0 || selected.allOf.length > 0) && (
              <section className="space-y-1 text-xs text-secondary">
                <Composition label="oneOf" refs={selected.oneOf} />
                <Composition label="anyOf" refs={selected.anyOf} />
                <Composition label="allOf" refs={selected.allOf} />
              </section>
            )}
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Used by</h4>
              <div className="flex flex-wrap gap-1.5">{selected.inboundRefs.length > 0 ? selected.inboundRefs.map((ref) => <OpenApiBadge key={ref} tone="muted">{ref}</OpenApiBadge>) : <span className="text-xs text-secondary">No local references found.</span>}</div>
            </section>
            <CopyBlock title="JSON Example" value={JSON.stringify(sampleForSchema(selected, schemas), null, 2)} />
            <CopyBlock title="TypeScript" value={typeScriptForSchema(selected)} />
          </div>
        ) : <div className="text-sm text-secondary">No schemas found.</div>}
      </div>
    </div>
  );
};

const Composition: React.FC<{ label: string; refs: string[] }> = ({ label, refs }) => (
  refs.length > 0 ? <div><span className="font-semibold text-main">{label}:</span> {refs.join(", ")}</div> : null
);

const CopyBlock: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <section>
    <div className="mb-2 flex items-center justify-between">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">{title}</h4>
      <CopyButton title={`Copy ${title}`} value={value} />
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
    <button className="rounded border border-base p-1 text-secondary hover:text-main" onClick={() => void handleCopy()} title={copied ? "Copied" : title}>
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
};
