import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

/**
 * This class uses the Singleton pattern to ensure that only one instance of the pipeline is loaded.
 */
class CodeCompletionPipeline {
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
        await CodeCompletionPipeline.getInstance(x => {
            console.log(`[${Date.now()}] [CodegenWorker] Progress callback:`, x);
            self.postMessage({ ...x, modelType: 'codegen' });
        });
        console.log(`[${Date.now()}] [CodegenWorker] Model ready`);
        self.postMessage({ 
            status: 'ready', 
            modelType: 'codegen',
            modelName: CodeCompletionPipeline.model // Send the model name
        });
        return;
    }

    if (type === 'generate') {
        console.log(`[${Date.now()}] [CodegenWorker] Starting generation`);
        
        // Retrieve the code-completion pipeline. When called for the first time,
        // this will load the pipeline and save it for future use.
        let generator = await CodeCompletionPipeline.getInstance(x => {
            // We also add a progress callback to the pipeline so that we can
            // track model loading.
            console.log(`[${Date.now()}] [CodegenWorker] Progress during generation:`, x);
            self.postMessage({ ...x, modelType: 'codegen' });
        });

        console.log(`[${Date.now()}] [CodegenWorker] Generator ready, starting generation`);

        // Validate input text
        if (!text || text.trim().length === 0) {
            console.error(`[${Date.now()}] [CodegenWorker] Invalid input text:`, text);
            self.postMessage({
                status: 'error',
                error: 'Invalid input text',
                modelType: 'codegen',
            });
            return;
        }

        // Preprocess input text
        const processedText = text.trim();
        console.log(`[${Date.now()}] [CodegenWorker] Input text length:`, processedText.length);
        console.log(`[${Date.now()}] [CodegenWorker] Input text preview:`, processedText.substring(0, 100) + (processedText.length > 100 ? '...' : ''));

        // Track the input text length to extract only generated tokens
        const inputTextLength = processedText.length;
        let previousGeneratedLength = 0;
        let finalGeneratedText = ''; // Track the final generated text

        try {
            // Actually perform the code-completion
            let output = await generator(processedText, {
                max_new_tokens: Math.min(max_new_tokens, 64), // Limit to 64 tokens to avoid issues
                temperature: 0.1, // Lower temperature for more stable generation
                top_k: 10,
                do_sample: true, // Enable sampling
                pad_token_id: generator.tokenizer.eos_token_id, // Add padding token
                eos_token_id: generator.tokenizer.eos_token_id, // Add EOS token

                // Allows for partial output - this is the key difference!
                callback_function: x => {
                    console.log(`[${Date.now()}] [CodegenWorker] Callback called with:`, x);
                    
                    // Get the current cumulative output (includes input text + generated text)
                    const currentOutput = generator.tokenizer.decode(x[0].output_token_ids, { skip_special_tokens: true });
                    console.log(`[${Date.now()}] [CodegenWorker] Current cumulative output:`, currentOutput?.length || 0, 'chars');
                    
                    // Extract only the generated tokens by removing input text and previous generated tokens
                    const generatedText = currentOutput.slice(inputTextLength);
                    const newTokens = generatedText.slice(previousGeneratedLength);
                    console.log(`[${Date.now()}] [CodegenWorker] Generated text:`, generatedText?.length || 0, 'chars');
                    console.log(`[${Date.now()}] [CodegenWorker] New tokens:`, newTokens?.length || 0, 'chars');
                    
                    // Update the previous generated length for next iteration
                    previousGeneratedLength = generatedText.length;
                    
                    // Track the final generated text for the complete result
                    finalGeneratedText = generatedText;
                    
                    // Send only the new tokens for streaming
                    self.postMessage({
                        status: 'update',
                        output: newTokens, // Send only the new tokens
                        modelType: 'codegen',
                    });
                }
            });

            console.log(`[${Date.now()}] [CodegenWorker] Generation complete, output:`, output);
            console.log(`[${Date.now()}] [CodegenWorker] Final generated text:`, finalGeneratedText?.length || 0, 'chars');

            // Use the tracked final generated text for the complete result
            const completeResult = processedText + finalGeneratedText;
            
            self.postMessage({
                status: 'complete',
                output: completeResult, // Send as string, not array
                modelType: 'codegen',
            });
        } catch (error) {
            console.error(`[${Date.now()}] [CodegenWorker] Generation error:`, error);
            
            // Try a simpler approach without callback_function if the first attempt fails
            if (error.message.includes('offset is out of bounds')) {
                console.log(`[${Date.now()}] [CodegenWorker] Trying simpler generation approach without callback`);
                try {
                    const simpleOutput = await generator(processedText, {
                        max_new_tokens: Math.min(max_new_tokens, 256),
                        temperature: 0.5,
                        top_k: 10,
                        do_sample: true,
                        pad_token_id: generator.tokenizer.eos_token_id,
                        eos_token_id: generator.tokenizer.eos_token_id,
                    });
                    
                    console.log(`[${Date.now()}] [CodegenWorker] Simple generation successful:`, simpleOutput);
                    
                    self.postMessage({
                        status: 'complete',
                        output: simpleOutput, // Send the complete output
                        modelType: 'codegen',
                    });
                    return;
                } catch (simpleError) {
                    console.error(`[${Date.now()}] [CodegenWorker] Simple generation also failed:`, simpleError);
                }
            }
            
            self.postMessage({
                status: 'error',
                error: error.message || 'Generation failed',
                modelType: 'codegen',
            });
        }
    }
}); 