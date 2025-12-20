/**
 * Environment loader
 *
 * Loads .env from repo root regardless of current working directory.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '..', '.env');

dotenv.config({ path: envPath });
