/**
 * Refreshes the staging database with a copy of production.
 *
 *   SOURCE_MONGODB_URI=<prod uri> node server/scripts/copy-db-to-staging.js --apply
 *
 * The target is MONGODB_URI from the staging .env, and its database name must
 * contain "staging" (so production can never be overwritten by mistake).
 * After copying, every push device is switched off, so staging can never send
 * a notification to a real student's phone; devices that sign in to the
 * staging app register again. OTPs are not copied.
 */
const SKIP = new Set(['otps', 'system.profile']);

const dbNameOf = (uri) => {
  const m = String(uri || '').match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/);
  return m ? decodeURIComponent(m[1]) : '';
};

const main = async () => {
  require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env', quiet: true });
  const sourceUri = process.env.SOURCE_MONGODB_URI;
  const targetUri = process.env.MONGODB_URI;
  const apply = process.argv.includes('--apply');
  const sourceDb = dbNameOf(sourceUri);
  const targetDb = dbNameOf(targetUri);
  if (!sourceUri || !targetUri) throw new Error('SOURCE_MONGODB_URI and MONGODB_URI are required.');
  if (!/staging/i.test(targetDb)) throw new Error(`Target database "${targetDb}" does not contain "staging"; refusing.`);
  if (sourceDb === targetDb) throw new Error('Source and target are the same database; refusing.');

  const { MongoClient } = require('mongodb');
  const src = await MongoClient.connect(sourceUri);
  const dst = await MongoClient.connect(targetUri);
  try {
    const from = src.db(sourceDb);
    const to = dst.db(targetDb);
    const collections = (await from.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name).filter((n) => !SKIP.has(n) && !n.startsWith('system.'));
    console.log(`${apply ? 'Copying' : 'Would copy'} ${collections.length} collections: ${sourceDb} -> ${targetDb}`);
    if (!apply) return;

    for (const name of collections) {
      await to.collection(name).drop().catch(() => {});
      const docs = await from.collection(name).find({}).toArray();
      if (docs.length) {
        for (let i = 0; i < docs.length; i += 1000) {
          await to.collection(name).insertMany(docs.slice(i, i + 1000), { ordered: false });
        }
      }
      const indexes = (await from.collection(name).indexes()).filter((ix) => ix.name !== '_id_');
      for (const { key, v, ns, ...opts } of indexes) {
        await to.collection(name).createIndex(key, opts).catch((e) => console.warn(`  index ${name}.${opts.name}: ${e.message}`));
      }
      console.log(`  ${name}: ${docs.length}`);
    }
    const off = await to.collection('pushdevices').updateMany({}, { $set: { isActive: false } });
    console.log(`Push devices switched off on staging: ${off.modifiedCount}`);
  } finally {
    await src.close();
    await dst.close();
  }
};

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

module.exports = { dbNameOf };
