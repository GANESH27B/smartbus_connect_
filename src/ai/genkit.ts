import {genkit} from 'genkit';
import {openAICompatible} from '@genkit-ai/compat-oai';

export const ai = genkit({
  plugins: [
    openAICompatible({
      name: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY?.trim(),
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': 'https://smart-bus-connect.vercel.app', // Optional, for OpenRouter rankings
        'X-Title': 'SmartBus Connect', // Optional
      },
    }),
  ],
  model: 'openrouter/google/gemini-2.0-flash-001',
});
