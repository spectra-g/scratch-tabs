import { ShareStrategy } from "../types";

/**
 * Share strategy for JSON content
 * Allows selecting specific top-level keys to reduce payload size
 */
export const jsonShareStrategy: ShareStrategy = {
    supportsCustomTrim: true,

    /**
     * Check if content is valid JSON
     */
    canTrim: (content: string) => {
        try {
            JSON.parse(content);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Dynamically import the trim UI component
     */
    getTrimUI: () => import("./JsonTrimUI"),

    /**
     * Encode selected keys into a short string
     * Format: "keys=k1,k2,k3" or "full"
     */
    encodeMetadata: (selection: string[] | { keys: string[] }) => {
        // Selection can be the raw array of keys or the UI selection object
        const keys = Array.isArray(selection) ? selection : selection?.keys;

        if (!keys || !Array.isArray(keys) || keys.length === 0) return "full";
        return `keys=${keys.join(",")}`;
    },

    /**
     * Decode metadata string back into selection array
     */
    decodeMetadata: (metadata: string) => {
        if (!metadata || metadata === "full") return null;
        if (metadata.startsWith("keys=")) {
            return metadata.substring(5).split(",");
        }
        return null;
    },

    /**
     * Filter JSON to only include selected keys
     */
    applyTrim: (content: string, selection: string[] | { keys: string[] }) => {
        // Selection can be the raw array of keys or the decoded metadata
        const keys = Array.isArray(selection) ? selection : selection?.keys;
        if (!keys || keys.length === 0) return content;

        try {
            const parsed = JSON.parse(content);

            if (Array.isArray(parsed)) {
                // Handle array root by treating selection as indices
                return JSON.stringify(
                    parsed.filter((_, index) => keys.includes(index.toString())),
                    null,
                    2
                );
            } else if (typeof parsed === "object" && parsed !== null) {
                // Handle object root by filtering keys
                const trimmed: any = {};
                keys.forEach((key: string) => {
                    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
                        trimmed[key] = parsed[key];
                    }
                });
                return JSON.stringify(trimmed, null, 2);
            }

            return content;
        } catch (e) {
            console.error("Failed to apply JSON trim:", e);
            return content;
        }
    },

    /**
     * Validate that trimmed content is still valid JSON
     */
    validateTrimmedContent: (content: string) => {
        try {
            JSON.parse(content);
            return true;
        } catch {
            return false;
        }
    }
};
