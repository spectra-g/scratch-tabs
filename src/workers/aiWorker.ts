import { pipeline, SummarizationPipeline } from '@huggingface/transformers';

// Worker scope variable to hold the pipeline instance
let pipelineInstance: SummarizationPipeline | null = null;

// Handle messages from the main thread
self.onmessage = async (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'init':
            console.log('[Worker] Received init request');
            try {
                if (pipelineInstance) {
                    console.log('[Worker] Already initialized.');
                    self.postMessage({ type: 'init_complete' });
                    return;
                }
                pipelineInstance = await pipeline(
                    'summarization',
                    'Xenova/distilbart-cnn-6-6',
                    {
                        progress_callback: (progress: any) => {
                            // Forward progress to the main thread
                            self.postMessage({ type: 'progress', payload: progress });
                        },
                    }
                ) as SummarizationPipeline;
                console.log('[Worker] Initialization complete.');
                self.postMessage({ type: 'init_complete' });
            } catch (error) {
                console.error('[Worker] Initialization failed:', error);
                self.postMessage({ type: 'init_error', payload: error instanceof Error ? error.message : String(error) });
            }
            break;

        case 'summarize':
            console.log('[Worker] Received summarize request');
            if (!pipelineInstance) {
                self.postMessage({ type: 'summary_error', payload: 'Pipeline not initialized.' });
                return;
            }
            try {
                const text = payload.text;
                const result = await pipelineInstance(text);
                 let summary = '';
                 // Handle different possible result formats from the pipeline
                 if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && result[0] !== null && 'summary_text' in result[0]) {
                    summary = (result[0] as { summary_text: string }).summary_text.trim();
                 } else if (typeof result === 'string') {
                    summary = result.trim();
                 } else {
                    console.warn('[Worker] Unexpected summary result format:', result);
                    summary = "Could not extract summary.";
                 }
                console.log('[Worker] Summarization complete.');
                self.postMessage({ type: 'summary_result', payload: { summary } });
            } catch (error) {
                console.error('[Worker] Summarization failed:', error);
                self.postMessage({ type: 'summary_error', payload: error instanceof Error ? error.message : String(error) });
            }
            break;

        default:
            console.warn('[Worker] Received unknown message type:', type);
    }
};

console.log('[Worker] Worker script loaded.'); 