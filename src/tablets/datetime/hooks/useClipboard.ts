import { useState, useCallback } from 'react';

/**
 * Hook to handle clipboard operations with fallback
 */
export const useClipboard = () => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copy = useCallback(async (text: string, id: string = 'default') => {
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // Fallback for environments where navigator.clipboard might fail
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedId(id);
                setTimeout(() => setCopiedId(null), 2000);
            } catch (err) {
                console.error('Copy failed', err);
            }
            document.body.removeChild(textArea);
        }
    }, []);

    return { copy, copiedId };
};
