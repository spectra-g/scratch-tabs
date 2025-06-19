import { pipeline, SummarizationPipeline } from '@xenova/transformers';

// Worker scope variable to hold the pipeline instance
let pipelineInstance: SummarizationPipeline | null = null;

// Handle messages from the main thread
self.onmessage = async (event) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'init':
            try {
                if (pipelineInstance) {
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
                self.postMessage({ type: 'init_complete' });
            } catch (error) {
                self.postMessage({ type: 'init_error', payload: error instanceof Error ? error.message : String(error) });
            }
            break;

        case 'summarize':
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
                    summary = "Could not extract summary.";
                 }
                self.postMessage({ type: 'summary_result', payload: { summary } });
            } catch (error) {
                self.postMessage({ type: 'summary_error', payload: error instanceof Error ? error.message : String(error) });
            }
            break;

        default:
            console.warn('[Worker] Received unknown message type:', type);
    }
};
