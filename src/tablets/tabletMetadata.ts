import { TabletActionContext, TabletAction } from "./types";
import { FileText, Type, Shield, Network, Palette } from "../components/Icons";
import { tabletActionService } from "../services/tabletActionService";

export interface TabletMetadata {
  id: string;
  label: string;
  keywords: string[];
  description?: string;
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
    id: "graphql",
    label: "GraphQL Client",
    keywords: ["graphql", "api", "query", "mutation", "subscription", "schema"],
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
    label: "Command Vault",
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
    if (context.source === 'editor-tab' && context.tab && context.content && context.content.length > 50) {
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
              side: context.side,
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
  {
    id: "loremipsum",
    label: "Lorem Ipsum Generator",
    keywords: ["lorem", "ipsum", "placeholder", "text", "mock", "data", "generator"],
    getActionsForContext: (context) => {
      // Always available from any context
      return [
        {
          id: 'generate-content',
          label: 'Generate Mock Content',
          icon: Type,
          action: () => {
            tabletActionService.handleAction({
              targetTablet: 'loremipsum',
              action: 'new-tab',
              payload: {},
              source: { 
                titleHint: 'Lorem Ipsum Generator',
                side: context.side 
              },
            });
          },
        },
      ];
    },
  },
  {
    id: "checksum",
    label: "Checksum",
    keywords: ["checksum", "hash", "md5", "sha", "crc32", "verify", "integrity"],
    getActionsForContext: (context) => {
      const actions = [];
      
      // Always available
      actions.push({
        id: 'calculate-checksum',
        label: 'Calculate Checksum',
        icon: Shield,
        action: () => {
          tabletActionService.handleAction({
            targetTablet: 'checksum',
            action: 'new-tab',
            payload: context.content ? { text: context.content } : {},
            source: { 
              titleHint: 'Checksum',
              side: context.side 
            },
          });
        },
      });
      
      return actions;
    },
  },
  {
    id: "datetime",
    label: "Date & Time",
    keywords: ["date", "time", "timestamp", "timezone", "convert", "parse", "duration", "calculator"],
  },
  {
    id: "diagram",
    label: "Diagram Editor",
    description: "Interactive Mermaid diagram editor with live preview and optimization",
    keywords: ["diagram", "mermaid", "flowchart", "sequence", "gantt", "chart", "graph", "visualization"],
    getActionsForContext: (context) => {
      if (context.source === 'editor-tab' && context.content) {
        // Check if content looks like Mermaid diagram code
        const mermaidPatterns = [
          /flowchart\s+(TD|LR|BT|RL)/i,
          /graph\s+(TD|LR|BT|RL)/i,
          /sequenceDiagram/i,
          /gantt/i,
          /classDiagram/i,
          /stateDiagram/i,
          /erDiagram/i,
          /journey/i,
          /gitgraph/i,
          /pie\s+title/i,
          /mindmap/i,
          /timeline/i
        ];
        
        const isMermaidCode = mermaidPatterns.some(pattern => pattern.test(context.content));
        
        if (isMermaidCode) {
          return [{
            id: 'open-diagram-editor',
            label: 'Open in Diagram Editor',
            icon: Network,
            action: () => {
              tabletActionService.handleAction({
                targetTablet: 'diagram',
                action: 'new-tab',
                payload: { mermaidCode: context.content },
                source: { 
                  tabId: context.tab?.id,
                  titleHint: 'Diagram Editor',
                  side: context.side 
                }
              });
            }
          }];
        }
      }
      return [];
    }
  },
  {
    id: 'colourpalette',
    label: 'Colour Palette',
    description: 'Extract, create, and test colour palettes with accessibility insights',
    keywords: ['colour', 'palette', 'design', 'accessibility', 'contrast', 'css', 'extract'],
    getActionsForContext: (context) => {
      if (context.source === 'editor-tab' && context.content) {
        // Check if content contains color values
        const hasColors = /(?:#[a-fA-F0-9]{3,6}|rgb\(|hsl\(|color:)/i.test(context.content);
        if (hasColors) {
          return [
            {
              id: 'extract-colors-from-css',
              label: 'Extract Colors to Palette',
              icon: Palette,
              action: () => {
                // Extract colors from CSS/code and open colour palette
                tabletActionService.handleAction({
                  targetTablet: 'colourpalette',
                  action: 'new-tab',
                  payload: { extractFromText: context.content },
                  source: { 
                    tabId: context.tab?.id,
                    titleHint: 'Colour Palette',
                    side: context.side 
                  },
                });
              },
            },
          ];
        }
      }
      return [];
    },
  },
];
