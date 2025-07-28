import { Table } from "../../components/Icons";
import { extendedViewRegistry } from "../registry";
import { CsvTableViewer } from "./components/CsvTableViewer";

// Register the CSV table viewer
extendedViewRegistry.register({
  id: "csv-table",
  languageId: "csv",
  label: "Table View",
  icon: Table,
  component: CsvTableViewer,
  priority: 1,
});

export { CsvTableViewer };
export * from "./types";
export * from "./hooks/useCsvData";
