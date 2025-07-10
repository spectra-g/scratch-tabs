import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthType, HttpRequest } from "../types";
import { SensitiveDataManager } from "../../../utils/sensitiveDataManager";

interface AuthEditorProps {
  auth: HttpRequest["auth"];
  onChange: (auth: HttpRequest["auth"]) => void;
}

export const AuthEditor: React.FC<AuthEditorProps> = ({ auth, onChange }) => {
  const [showSecrets, setShowSecrets] = useState(false);

  const handleTypeChange = (type: AuthType) => {
    const newAuth = {
      type,
      params: type === auth.type ? auth.params : {},
    };

    // Set default values for API key auth
    if (type === "apikey" && !newAuth.params.addTo) {
      newAuth.params.addTo = "header";
    }

    onChange(newAuth);
  };

  const handleParamChange = (key: string, value: string) => {
    // Mask sensitive auth parameters
    const sensitiveFields = ["password", "token", "value", "secret"];
    const maskedValue = sensitiveFields.includes(key)
      ? SensitiveDataManager.mask(value)
      : value;

    onChange({
      ...auth,
      params: {
        ...auth.params,
        [key]: maskedValue,
      },
    });
  };

  const getDisplayValue = (key: string, value: string): string => {
    const sensitiveFields = ["password", "token", "value", "secret"];
    if (sensitiveFields.includes(key) && SensitiveDataManager.isMasked(value)) {
      return SensitiveDataManager.unmask(value);
    }
    return value || "";
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <button
          onClick={() => handleTypeChange("none")}
          className={`
            px-3 py-1.5 rounded-md text-sm
            ${
              auth.type === "none"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"
            }
            transition-colors
          `}
        >
          No Auth
        </button>

        <button
          onClick={() => handleTypeChange("basic")}
          className={`
            px-3 py-1.5 rounded-md text-sm
            ${
              auth.type === "basic"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"
            }
            transition-colors
          `}
        >
          Basic Auth
        </button>

        <button
          onClick={() => handleTypeChange("bearer")}
          className={`
            px-3 py-1.5 rounded-md text-sm
            ${
              auth.type === "bearer"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"
            }
            transition-colors
          `}
        >
          Bearer Token
        </button>

        <button
          onClick={() => handleTypeChange("apikey")}
          className={`
            px-3 py-1.5 rounded-md text-sm
            ${
              auth.type === "apikey"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50"
            }
            transition-colors
          `}
        >
          API Key
        </button>
      </div>

      {auth.type === "basic" && (
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={getDisplayValue("username", auth.params.username)}
              onChange={(e) => handleParamChange("username", e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="Username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showSecrets ? "text" : "password"}
                value={getDisplayValue("password", auth.params.password)}
                onChange={(e) => handleParamChange("password", e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors pr-10"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-300"
              >
                {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {auth.type === "bearer" && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Token
          </label>
          <div className="relative">
            <input
              type={showSecrets ? "text" : "password"}
              value={getDisplayValue("token", auth.params.token)}
              onChange={(e) => handleParamChange("token", e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors pr-10"
              placeholder="Bearer token"
            />
            <button
              type="button"
              onClick={() => setShowSecrets(!showSecrets)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-300"
            >
              {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      )}

      {auth.type === "apikey" && (
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Key
            </label>
            <input
              type="text"
              value={getDisplayValue("key", auth.params.key)}
              onChange={(e) => handleParamChange("key", e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="API key name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Value
            </label>
            <div className="relative">
              <input
                type={showSecrets ? "text" : "password"}
                value={getDisplayValue("value", auth.params.value)}
                onChange={(e) => handleParamChange("value", e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors pr-10"
                placeholder="API key value"
              />
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-300"
              >
                {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Add to
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={auth.params.addTo === "header" || !auth.params.addTo}
                  onChange={() => handleParamChange("addTo", "header")}
                  className="mr-2"
                />
                <span className="text-sm text-gray-300">Header</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  checked={auth.params.addTo === "query"}
                  onChange={() => handleParamChange("addTo", "query")}
                  className="mr-2"
                />
                <span className="text-sm text-gray-300">Query Parameter</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
