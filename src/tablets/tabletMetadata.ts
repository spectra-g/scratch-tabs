import { TabletActionContext, TabletAction } from "./types";
import { FileText } from "../components/Icons";
import { tabletActionService } from "../services/tabletActionService";

export interface TabletMetadata {
  id: string;
  label: string;
  keywords: string[];
  // NEW: Add the optional action discovery function to the metadata.
  getActionsForContext?(context: TabletActionContext): TabletAction[];
}

export const tabletMetadata: TabletMetadata[] = [
  {
    id: "base64",
    label: "Base64",
    keywords: ["base64", "encode", "decode", "encoding", "binary"],
  },
  {
    id: "calculator",
    label: "Calculator",
    keywords: ["calculator", "math", "arithmetic", "compute", "calculate"],
  },
  {
    id: "clipboard",
    label: "Clipboard",
    keywords: ["clipboard", "copy", "paste", "history", "snippets"],
  },
  {
    id: "converter",
    label: "Converter",
    keywords: ["convert", "encode", "decode", "hash", "transform", "format"],
  },
  {
    id: "cron",
    label: "Cron Expression Builder",
    keywords: [
      "cron",
      "schedule",
      "job",
      "task",
      "expression",
      "time",
      "scheduler",
      "automation",
    ],
  },
  {
    id: "tempemail",
    label: "Temp Email",
    keywords: ["email", "temporary", "disposable", "mail", "inbox"],
  },
  {
    id: "ipdetails",
    label: "IP Details",
    keywords: ["ip", "address", "location", "network", "geolocation"],
  },
  {
    id: "jsonmapper",
    label: "JSON Mapper",
    keywords: ["json", "mapper", "transform", "mapping", "data"],
  },
  {
    id: "jwt",
    label: "JWT",
    keywords: ["jwt", "token", "json web token", "authentication", "decode"],
  },
  {
    id: "openmetrics",
    label: "OpenMetrics Viewer",
    keywords: [
      "metrics",
      "prometheus",
      "openmetrics",
      "monitoring",
      "prom",
      "exposition",
    ],
  },
  {
    id: "password",
    label: "Password Generator",
    keywords: ["password", "generator", "secure", "random", "crypto"],
  },
  {
    id: "pomodoro",
    label: "Pomodoro Timer",
    keywords: ["pomodoro", "timer", "productivity", "focus", "time"],
  },
  {
    id: "promptmanager",
    label: "Prompt Manager",
    keywords: ["prompt", "manager", "ai", "templates", "snippets"],
  },
  {
    id: "regex",
    label: "Regex Tester",
    keywords: [
      "regex",
      "regexp",
      "pattern",
      "match",
      "test",
      "validate",
      "expression",
    ],
  },
  {
    id: "restclient",
    label: "REST Client",
    keywords: ["rest", "api", "http", "client", "request", "curl"],
  },
  {
    id: "shapesnap",
    label: "Shape Snap",
    keywords: [
      "draw",
      "diagram",
      "shapes",
      "sketch",
      "flowchart",
      "whiteboard",
    ],
  },
  {
    id: "urlparser",
    label: "URL Parser",
    keywords: [
      "url",
      "uri",
      "parser",
      "analyzer",
      "web",
      "http",
      "https",
      "domain",
      "query",
      "fragment",
    ],
  },
  {
    id: "usergen",
    label: "User Generator",
    keywords: ["user", "generator", "random", "profile", "data"],
  },
  {
    id: "uuid",
    label: "UUID Generator",
    keywords: ["uuid", "guid", "identifier", "unique", "generate"],
  },
  {
    id: "vault",
    label: "Knowledge Vault",
    keywords: [
      "vault",
      "snippets",
      "knowledge base",
      "code",
      "notes",
      "commands",
    ],
  },
{
  id: "wordcount",
  label: "Word Count",
  keywords: [
    "word",
    "count",
    "text",
    "analysis",
    "statistics",
    "readability",
    "writing",
    "seo",
    "keywords",
    "density",
    "flesch",
    "kincaid",
    "syllables",
    "sentences",
    "paragraphs",
    "characters",
  ],
  // NEW: Implement the action discovery logic for Word Count here.
  // This function is lightweight and has no heavy dependencies.
  getActionsForContext: (context) => {
    const actions: TabletAction[] = [];
    if (context.source === 'editor-tab' && context.content && context.content.length > 50) {
      actions.push({
        id: 'wordcount.new-tab-from-content',
        label: 'Open in Word Count',
        icon: FileText,
        action: () => {
          if (!context.tab) return;
          tabletActionService.handleAction({
            targetTablet: 'wordcount',
            action: 'new-tab',
            payload: {
              content: context.content || '',
              title: context.tab.title,
            },
            source: {
              tabId: context.tab.id,
              titleHint: `${context.tab.title} (Analysis)`,
            }
          });
        }
      });
    }
    return actions;
  },
},
{
  id: "emoji",
  label: "Emoji as Data",
  keywords: ["emoji", "unicode", "symbols", "formatter", "picker", "data", "encoding"],
},
];
