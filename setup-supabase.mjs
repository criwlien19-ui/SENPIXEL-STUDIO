/**
 * Script de configuration automatique Supabase
 * Crée la table gallery_photos et le bucket gallery
 * Usage: node setup-supabase.mjs
 */

const SUPABASE_URL = 'https://vpsevodblxknrmvhakry.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwc2V2b2RibHhrbnJtdmhha3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzcwMTMsImV4cCI6MjA4OTUxMzAxM30.yUT-7rHzJPQ9sZp4j04wycNrTaYnqD9-RWSR2L910nc';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function checkTableExists() {
  console.log('\n🔍 Vérification de la table gallery_photos...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/gallery_photos?limit=1`, { headers });
  if (res.status === 200) {
    console.log('✅ Table gallery_photos : EXISTE DÉJÀ');
    return true;
  }
  if (res.status === 404 || res.status === 406) {
    console.log('❌ Table gallery_photos : ABSENTE');
    return false;
  }
  const txt = await res.text();
  console.log(`ℹ️  Status: ${res.status} — ${txt}`);
  return false;
}

async function checkBucketExists() {
  console.log('\n🔍 Vérification du bucket storage "gallery"...');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/gallery`, { headers });
  if (res.status === 200) {
    console.log('✅ Bucket "gallery" : EXISTE DÉJÀ');
    return true;
  }
  console.log('❌ Bucket "gallery" : ABSENT');
  return false;
}

async function createBucket() {
  console.log('\n🪣 Création du bucket "gallery"...');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: 'gallery', name: 'gallery', public: true }),
  });
  const data = await res.json();
  if (res.ok) {
    console.log('✅ Bucket "gallery" créé avec succès !');
    return true;
  }
  console.log(`⚠️  Impossible de créer le bucket automatiquement: ${data.message || JSON.stringify(data)}`);
  return false;
}

async function createStoragePolicies() {
  console.log('\n🔐 Les politiques Storage seront configurées via le Dashboard Supabase.');
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  SETUP SUPABASE — SenpixelStudio Tabaski');
  console.log('═══════════════════════════════════════════');

  // ── 1. Vérifier la table ──
  const tableExists = await checkTableExists();

  // ── 2. Vérifier/créer le bucket ──
  const bucketExists = await checkBucketExists();
  let bucketCreated = bucketExists;
  if (!bucketExists) {
    bucketCreated = await createBucket();
  }

  // ── RÉSUMÉ ──
  console.log('\n═══════════════════════════════════════════');
  console.log('  RÉSUMÉ');
  console.log('═══════════════════════════════════════════');

  if (!tableExists) {
    console.log(`
❌ TABLE MANQUANTE — Action requise:
   1. Allez sur: https://supabase.com/dashboard/project/vpsevodblxknrmvhakry/sql/new
   2. Copiez-collez et exécutez le SQL suivant:

─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id          TEXT PRIMARY KEY DEFAULT 'img-' || extract(epoch from now())::bigint::text,
  url         TEXT NOT NULL,
  span        TEXT NOT NULL DEFAULT 'col-span-1 row-span-2',
  is_best     BOOLEAN NOT NULL DEFAULT false,
  likes       INTEGER NOT NULL DEFAULT 0,
  caption     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read gallery_photos"
  ON public.gallery_photos FOR SELECT USING (true);

CREATE POLICY "Public insert gallery_photos"
  ON public.gallery_photos FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update gallery_photos"
  ON public.gallery_photos FOR UPDATE USING (true);

CREATE POLICY "Public delete gallery_photos"
  ON public.gallery_photos FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.gallery_photos;
─────────────────────────────────────────────────────────────────────────────
`);
  } else {
    console.log('✅ Table gallery_photos : OK');
  }

  if (!bucketCreated) {
    console.log(`
❌ BUCKET STORAGE MANQUANT — Action requise:
   1. Allez sur: https://supabase.com/dashboard/project/vpsevodblxknrmvhakry/storage/buckets
   2. Cliquez "New bucket"
   3. Nom: gallery  |  Cochez: Public bucket ✅
   4. Puis dans "Policies" du bucket, ajoutez:
      INSERT/SELECT/DELETE avec: bucket_id = 'gallery'
`);
  } else {
    console.log('✅ Bucket "gallery" Storage : OK');
    if (!bucketExists) {
      console.log(`
⚠️  POLITIQUES STORAGE à configurer manuellement:
   → https://supabase.com/dashboard/project/vpsevodblxknrmvhakry/storage/buckets
   → Dans le bucket "gallery" > Policies > New policy:
     - INSERT : WITH CHECK (bucket_id = 'gallery')
     - SELECT : USING (bucket_id = 'gallery')  
     - DELETE : USING (bucket_id = 'gallery')
`);
    }
  }

  if (tableExists && bucketCreated) {
    console.log('\n🎉 TOUT EST PRÊT ! Le déploiement peut se faire.');
  } else {
    console.log('\n⚠️  Exécutez le SQL manquant, puis relancez: node setup-supabase.mjs');
  }
}

main().catch(console.error);
