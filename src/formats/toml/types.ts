import { SmartViewProps } from "../../views/registry";

export interface TomlSmartViewProps extends SmartViewProps {}

export interface TomlValidationError {
  message: string;
}

export interface TomlSmartViewState {
  validationError: TomlValidationError | null;
}

