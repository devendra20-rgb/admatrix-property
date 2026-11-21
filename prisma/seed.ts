import { ensureDbSeeded } from '../src/lib/seed';

async function main() {
  const result = await ensureDbSeeded();
  console.log('Seed result:', result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
