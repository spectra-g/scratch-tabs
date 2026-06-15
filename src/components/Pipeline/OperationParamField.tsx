import React from "react";
import { ParameterDefinition } from "../../services/pipeline/types";

interface OperationParamFieldProps {
  param: ParameterDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

const inputClass =
  "w-full px-2 py-1 text-sm bg-element border border-base rounded focus:outline-none focus:border-focus text-main";

export const OperationParamField: React.FC<OperationParamFieldProps> = ({
  param,
  value,
  onChange,
}) => (
  <div>
    <label className="block text-xs text-muted mb-1">
      {param.label}
      {param.required && <span className="text-danger ml-1">*</span>}
    </label>

    {param.type === "boolean" ? (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={(value as boolean) ?? param.default ?? false}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-base"
        />
        <span className="text-sm text-main">{param.description}</span>
      </label>
    ) : param.type === "select" ? (
      <select
        value={(value as string) ?? param.default ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {param.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : param.type === "number" ? (
      <input
        type="number"
        value={(value as number) ?? param.default ?? 0}
        min={param.min}
        max={param.max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputClass}
      />
    ) : param.type === "textarea" ? (
      <textarea
        value={(value as string) ?? param.default ?? ""}
        placeholder={param.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} font-mono`}
        rows={4}
      />
    ) : (
      <input
        type="text"
        value={(value as string) ?? param.default ?? ""}
        placeholder={param.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    )}

    {param.description && param.type !== "boolean" && (
      <p className="text-xs text-muted mt-0.5">{param.description}</p>
    )}
  </div>
);
