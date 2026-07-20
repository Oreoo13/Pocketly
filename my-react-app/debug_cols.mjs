import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('D:\\Coding\\MoneyTracker\\my-react-app\\.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/['"]/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data: cat } = await supabase.from('categories').select('*').limit(1);
  const { data: acc } = await supabase.from('accounts').select('*').limit(1);
  console.log('Categories keys:', cat && cat.length ? Object.keys(cat[0]) : 'empty');
  console.log('Accounts keys:', acc && acc.length ? Object.keys(acc[0]) : 'empty');
}
run();
