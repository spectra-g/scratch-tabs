import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

class CodegenPipeline {
    static task = 'text-generation';
    static model = 'Xenova/codegen-350M-mono';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
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

    if (type === 'init') {
        // Just trigger model loading
        await CodegenPipeline.getInstance(x => self.postMessage({ ...x, modelType: 'codegen' }));
        self.postMessage({ status: 'ready', modelType: 'codegen' });
        return;
    }

    if (type === 'generate') {
        let generator = await CodegenPipeline.getInstance(x => self.postMessage({ ...x, modelType: 'codegen' }));
        let output = await generator(text, {
            max_new_tokens,
            temperature,
            top_k,
            do_sample,
            callback_function: x => {
                const decoded = generator.tokenizer.decode(x[0].output_token_ids, { skip_special_tokens: true });
                self.postMessage({
                    status: 'update',
                    output: decoded,
                    modelType: 'codegen',
                });
            }
        });
        let generated = Array.isArray(output) && output[0]?.generated_text ? output[0].generated_text : '';
        self.postMessage({ status: 'complete', output: generated, modelType: 'codegen' });
    }
}); 