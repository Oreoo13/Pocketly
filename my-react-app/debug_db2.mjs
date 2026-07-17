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
  const { data: accounts } = await supabase.from('accounts').select('*');
  const { data: txs } = await supabase.from('transactions').select('id, description, account_id').limit(10);
  console.log('ACCOUNTS:', JSON.stringify(accounts, null, 2));
  console.log('TXS:', JSON.stringify(txs, null, 2));
}
run();
