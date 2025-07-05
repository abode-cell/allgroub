'use server';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import * as nextPlugin from '@genkit-ai/next';

export const ai = genkit({
  plugins: [nextPlugin, googleAI()],
});
