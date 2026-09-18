import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const uploadsDir = path.join(rootDir, 'uploads', 'work_evidence');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'work-evidence';

async function migrateEvidenceFiles() {
  console.log('====================================================');
  console.log('MARG Work Evidence Supabase Storage Migration Tool');
  console.log('====================================================\n');

  if (!fs.existsSync(uploadsDir)) {
    console.log(`[INFO] No local uploads directory found at: ${uploadsDir}`);
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY environment variables are required.');
    console.error('Please configure Supabase credentials in your environment and try again.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log(`Creating bucket '${BUCKET_NAME}' in Supabase Storage...`);
    const { error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false
    });
    if (createErr) {
      console.warn(`[WARNING] Could not create bucket automatically: ${createErr.message}`);
    }
  }

  const files = fs.readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
  console.log(`Found ${files.length} local evidence files in ${uploadsDir}\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType,
        upsert: false
      });

    if (error) {
      if (error.message?.includes('already exists') || error.error === 'Duplicate') {
        skipped++;
      } else {
        console.error(`[FAIL] ${filename}: ${error.message}`);
        failed++;
      }
    } else {
      console.log(`[SUCCESS] Uploaded ${filename}`);
      uploaded++;
    }
  }

  console.log('\n====================================================');
  console.log('EVIDENCE STORAGE MIGRATION SUMMARY');
  console.log(`Files Found:    ${files.length}`);
  console.log(`Files Uploaded: ${uploaded}`);
  console.log(`Files Skipped:  ${skipped}`);
  console.log(`Files Failed:   ${failed}`);
  console.log('====================================================\n');
}

migrateEvidenceFiles().catch(err => {
  console.error('[FATAL] Evidence migration failed:', err);
  process.exit(1);
});
