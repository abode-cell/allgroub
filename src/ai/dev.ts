import { config } from 'dotenv';
config();

import '@/ai/flows/generate-daily-summary.ts';
import '@/ai/flows/ai-support-assistant.ts';
import '@/ai/flows/calculate-dashboard-metrics.ts';
