import type { ParameterDefinition } from "../../../services/pipeline/types";

interface CanvasTransformParamsFormProps {
  parameters: ParameterDefinition[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}

const inputClassName =
  "w-full rounded border border-base bg-surface px-2 py-1 text-xs text-main focus:outline-none focus:ring-2 focus:ring-primary";

/** Generic renderer for pipeline operation parameters. No operation knowledge here. */
export const CanvasTransformParamsForm = ({
  parameters,
  values,
  onChange,
}: CanvasTransformParamsFormProps) => {
  if (parameters.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" data-testid="canvas-transform-params">
      {parameters.map((param) => {
        const value = values[param.name] ?? param.default ?? "";
        const fieldId = `canvas-transform-param-${param.name}`;
        return (
          <label key={param.name} className="flex flex-col gap-1 text-xs" htmlFor={fieldId}>
            <span className="font-medium text-main">
              {param.label}
              {param.required ? " *" : ""}
            </span>
            {param.type === "boolean" ? (
              <input
                id={fieldId}
                type="checkbox"
                data-testid={`canvas-transform-param-${param.name}`}
                checked={value === true}
                onChange={(event) => onChange(param.name, event.target.checked)}
              />
            ) : param.type === "select" ? (
              <select
                id={fieldId}
                className={inputClassName}
                data-testid={`canvas-transform-param-${param.name}`}
                value={String(value)}
                onChange={(event) => onChange(param.name, event.target.value)}
              >
                {(param.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : param.type === "multiselect" ? (
              <div
                className="flex flex-col gap-1"
                data-testid={`canvas-transform-param-${param.name}`}
              >
                {(param.options ?? []).map((option) => {
                  const selected = Array.isArray(value)
                    ? (value as unknown[]).map(String).includes(option.value)
                    : false;
                  return (
                    <label key={option.value} className="flex items-center gap-2 text-xs text-secondary">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          const current = Array.isArray(value)
                            ? (value as unknown[]).map(String)
                            : [];
                          onChange(
                            param.name,
                            event.target.checked
                              ? [...current, option.value]
                              : current.filter((entry) => entry !== option.value),
                          );
                        }}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            ) : param.type === "number" ? (
              <input
                id={fieldId}
                type="number"
                className={inputClassName}
                data-testid={`canvas-transform-param-${param.name}`}
                value={typeof value === "number" ? value : ""}
                min={param.min}
                max={param.max}
                placeholder={param.placeholder}
                onChange={(event) =>
                  onChange(
                    param.name,
                    event.target.value === "" ? undefined : Number(event.target.value),
                  )
                }
              />
            ) : param.type === "textarea" ? (
              <textarea
                id={fieldId}
                className={`${inputClassName} min-h-16 resize-y`}
                data-testid={`canvas-transform-param-${param.name}`}
                value={typeof value === "string" ? value : ""}
                placeholder={param.placeholder}
                onChange={(event) => onChange(param.name, event.target.value)}
              />
            ) : (
              <input
                id={fieldId}
                type="text"
                className={inputClassName}
                data-testid={`canvas-transform-param-${param.name}`}
                value={typeof value === "string" ? value : ""}
                placeholder={param.placeholder}
                onChange={(event) => onChange(param.name, event.target.value)}
              />
            )}
            {param.description ? (
              <span className="text-[11px] text-muted">{param.description}</span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
};
