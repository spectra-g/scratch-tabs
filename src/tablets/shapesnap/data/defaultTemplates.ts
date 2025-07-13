import { ShapeSnapTemplate } from "../types";

export const defaultShapeSnapTemplates: ShapeSnapTemplate[] = [
  {
    id: "template-basic-flowchart",
    title: "Basic Flowchart",
    description:
      "A simple flowchart template with start, process, decision, and end elements",
    category: "Flowcharts",
    canvas: {
      background: "#1e1e1e",
      mode: "dark",
    },
    shapes: [
      // Start (Circle)
      {
        id: "start-circle",
        type: "circle",
        x: 200,
        y: 50,
        radius: 30,
        label: "Start",
        style: {
          stroke: "#ffffff",
          strokeWidth: 2,
        },
        zIndex: 1,
      },
      // Arrow down from start
      {
        id: "arrow-1",
        type: "line",
        points: [
          { x: 200, y: 80 },
          { x: 200, y: 120 },
        ],
        arrowTipEnd: "simple",
        arrowTipSize: 8,
        style: {
          stroke: "#ffffff",
          strokeWidth: 2,
        },
        zIndex: 1,
      },
      // Process (Rectangle)
      {
        id: "process-rect",
        type: "rectangle",
        x: 150,
        y: 120,
        width: 100,
        height: 60,
        label: "Process",
        style: {
          stroke: "#ffffff",
          strokeWidth: 2,
        },
        zIndex: 1,
      },
      // Arrow down from process
      {
        id: "arrow-2",
        type: "line",
        points: [
          { x: 200, y: 180 },
          { x: 200, y: 220 },
        ],
        arrowTipEnd: "simple",
        arrowTipSize: 8,
        style: {
          stroke: "#ffffff",
          strokeWidth: 2,
        },
        zIndex: 1,
      },
      // Decision (Diamond)
      {
        id: "decision-diamond",
        type: "diamond",
        x: 200,
        y: 260,
        width: 100,
        height: 80,
        label: "Decision?",
        style: {
          stroke: "#ffffff",
          strokeWidth: 2,
        },
        zIndex: 1,
      },
      // Arrow left from decision (No) - from left point of diamond
      {
        id: "arrow-no",
        type: "line",
        points: [
          { x: 150, y: 260 },
          { x: 80, y: 260 },
        ],
        arrowTipEnd: "simple",
        arrowTipSize: 8,
        style: {
          stroke: "#ffffff",
          strokeWidth: 2,
        },
        zIndex: 1,
      },
      // No Label
      {
        id: "no-text",
        type: "text",
        x: 100,
        y: 250,
        text: "No",
        fontSize: 12,
        style: {
          stroke: "#ffffff",
          strokeWidth: 1,
        },
        zIndex: 2,
      },
      // Arrow down from decision (Yes) - from bottom point of diamond
      {
        id: "arrow-yes",
        type: "line",
        points: [
          { x: 200, y: 300 },
          { x: 200, y: 340 },
        ],
        arrowTipEnd: "simple",
        arrowTipSize: 8,
        style: {
          stroke: "#ffffff",
          strokeWidth: 2,
        },
        zIndex: 1,
      },
      // Yes Label
      {
        id: "yes-text",
        type: "text",
        x: 210,
        y: 315,
        text: "Yes",
        fontSize: 12,
        style: {
          stroke: "#ffffff",
          strokeWidth: 1,
        },
        zIndex: 2,
      },
      // End (Circle)
      {
        id: "end-circle",
        type: "circle",
        x: 200,
        y: 370,
        radius: 30,
        label: "End",
        style: {
          stroke: "#ffffff",
          strokeWidth: 2,
        },
        zIndex: 1,
      },
    ],
    isBuiltIn: true,
  },
];
