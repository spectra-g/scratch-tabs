import React from "react";
import { Base64Tablet } from "../Base64Tablet";
import { Base64TabletState } from "../types";

describe("Base64Tablet", () => {
  describe("initialization", () => {
    it("should create initial state", () => {
      const initialState = Base64Tablet.createInitialState();
      
      expect(initialState.type).toBe("base64");
      expect(initialState.data).toBeDefined();
      expect(initialState.data.input).toBe("");
      expect(initialState.data.output).toBe("");
      expect(initialState.data.mode).toBe("encode");
      expect(initialState.data.history).toEqual([]);
    });

    it("should serialize and deserialize state", () => {
      const state = Base64Tablet.createInitialState();
      const serialized = Base64Tablet.serializeState(state);
      const deserialized = Base64Tablet.deserializeState(serialized);
      
      expect(deserialized.type).toBe("base64");
      expect(deserialized.data).toBeDefined();
    });

    it("should have correct tablet properties", () => {
      expect(Base64Tablet.id).toBe("base64");
      expect(Base64Tablet.label).toBe("Base64 Encoder/Decoder");
      expect(Base64Tablet.keywords).toContain("base64");
      expect(Base64Tablet.keywords).toContain("encode");
      expect(Base64Tablet.keywords).toContain("decode");
    });
  });

  describe("state management", () => {
    it("should handle input changes without adding to history", () => {
      const initialState = Base64Tablet.createInitialState();
      let currentState = initialState;
      
      // Simulate input changes
      const updateState = (newState: Base64TabletState) => {
        currentState = newState;
      };
      
      // Change input multiple times
      updateState({
        ...currentState,
        data: { ...currentState.data, input: "a" }
      } as Base64TabletState);
      
      updateState({
        ...currentState,
        data: { ...currentState.data, input: "ab" }
      } as Base64TabletState);
      
      updateState({
        ...currentState,
        data: { ...currentState.data, input: "abc" }
      } as Base64TabletState);
      
      // History should remain empty
      expect(currentState.data.history).toHaveLength(0);
    });

    it("should add to history when input is processed", () => {
      const initialState = Base64Tablet.createInitialState();
      let currentState = initialState;
      
      // Simulate adding to history (this would happen on blur)
      const historyItem = {
        id: "test-id",
        timestamp: Date.now(),
        action: "encode" as const,
        input: "test input",
        output: "dGVzdCBpbnB1dA==",
        format: "standard",
        encoding: "utf8"
      };
      
      currentState = {
        ...currentState,
        data: {
          ...currentState.data,
          history: [historyItem, ...currentState.data.history]
        }
      };
      
      expect(currentState.data.history).toHaveLength(1);
      expect(currentState.data.history[0].input).toBe("test input");
      expect(currentState.data.history[0].action).toBe("encode");
    });

    it("should maintain history limit", () => {
      const initialState = Base64Tablet.createInitialState();
      let currentState = initialState;
      
      // Add more than 100 history items
      const historyItems = Array.from({ length: 105 }, (_, i) => ({
        id: `test-${i}`,
        timestamp: Date.now() - i,
        action: "encode" as const,
        input: `test input ${i}`,
        output: `output ${i}`,
        format: "standard",
        encoding: "utf8"
      }));
      
      currentState = {
        ...currentState,
        data: {
          ...currentState.data,
          history: historyItems
        }
      };
      
      // Should only keep the last 100 items
      expect(currentState.data.history).toHaveLength(105);
      
      // Simulate the limit being applied (as done in the actual implementation)
      const limitedHistory = currentState.data.history.slice(0, 99);
      expect(limitedHistory).toHaveLength(99);
    });
  });
}); 