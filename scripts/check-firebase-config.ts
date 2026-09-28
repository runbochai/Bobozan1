import { loadEnv } from 'vite';
import { readFirebaseConfig } from '../src/config/firebaseConfig';

const { missing } = readFirebaseConfig({ ...loadEnv('production', process.cwd(), ''), ...process.env });
if (missing.length) {
  console.error(`Cannot deploy online play: missing ${missing.join(', ')}. Configure GitHub Actions variables/secrets or .env.local before building.`);
  process.exitCode = 1;
} else {
  console.log('Firebase build configuration is present. Values are not logged.');
}
