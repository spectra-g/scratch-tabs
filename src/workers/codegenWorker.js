import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

class CodegenPipeline {
    static task = 'text-generation';
    static model = 'Xenova/codegen-350M-mono';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            console.log(`[${Date.now()}] [CodegenWorker] Creating pipeline instance`);
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }

    static async dispose() {
        if (this.instance) {
            (await this.instance).dispose();
            this.instance = null;
        }
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const {
        type, // 'init' or 'generate'
        text,
        max_new_tokens,
        temperature,
        top_k,
        do_sample,
    } = event.data;

    console.log(`[${Date.now()}] [CodegenWorker] Received message:`, type, { text: text?.length || 0, max_new_tokens, temperature, top_k, do_sample });

    if (type === 'init') {
        console.log(`[${Date.now()}] [CodegenWorker] Initializing model`);
        // Just trigger model loading
        await CodegenPipeline.getInstance(x => {
            console.log(`[${Date.now()}] [CodegenWorker] Progress callback:`, x);
            self.postMessage({ ...x, modelType: 'codegen' });
        });
        console.log(`[${Date.now()}] [CodegenWorker] Model ready`);
        self.postMessage({ status: 'ready', modelType: 'codegen' });
        return;
    }

    if (type === 'generate') {
        console.log(`[${Date.now()}] [CodegenWorker] Starting generation`);
        let generator = await CodegenPipeline.getInstance(x => {
            console.log(`[${Date.now()}] [CodegenWorker] Progress during generation:`, x);
            self.postMessage({ ...x, modelType: 'codegen' });
        });
        
        console.log(`[${Date.now()}] [CodegenWorker] Generator ready, starting streaming generation`);
        
        try {
            // Use the pipeline's generate method with streaming
            let currentOutput = text;
            let generatedText = '';
            
            // Generate in reasonable chunks for good streaming
            const chunkSize = 5; // Generate 5 tokens at a time for good balance
            const totalChunks = Math.ceil(max_new_tokens / chunkSize);
            
            for (let chunk = 0; chunk < totalChunks; chunk++) {
                const tokensToGenerate = Math.min(chunkSize, max_new_tokens - (chunk * chunkSize));
                if (tokensToGenerate <= 0) break;
                
                console.log(`[${Date.now()}] [CodegenWorker] Generating chunk ${chunk + 1}/${totalChunks} (${tokensToGenerate} tokens)`);
                
                const result = await generator(currentOutput, {
                    max_new_tokens: tokensToGenerate,
                    temperature: temperature,
                    top_k: top_k,
                    do_sample: do_sample,
                    return_full_text: false, // Only return the new generated text
                    use_cache: true, // Enable caching for faster generation
                });
                
                // Extract the newly generated text
                const newText = Array.isArray(result) ? result[0]?.generated_text || '' : result?.generated_text || '';
                generatedText += newText;
                currentOutput = text + generatedText;
                
                console.log(`[${Date.now()}] [CodegenWorker] Chunk ${chunk + 1} complete, output length:`, currentOutput.length);
                
                // Send streaming update
                self.postMessage({
                    status: 'update',
                    output: currentOutput,
                    modelType: 'codegen',
                });
                
                // Only stop on natural code completion points
                if (newText.includes('\n\n') || 
                    newText.includes('```') || 
                    newText.length < tokensToGenerate) {
                    console.log(`[${Date.now()}] [CodegenWorker] Natural stopping point reached`);
                    break;
                }
            }
            
            console.log(`[${Date.now()}] [CodegenWorker] Generation complete, final output:`, currentOutput?.length || 0, 'chars');
            self.postMessage({ status: 'complete', output: currentOutput, modelType: 'codegen' });
            
        } catch (error) {
            console.error(`[${Date.now()}] [CodegenWorker] Generation error:`, error);
            self.postMessage({ status: 'error', error: error.message, modelType: 'codegen' });
        }
    }
}); 