const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qdbswcnitjdvruhgtiux.supabase.co',
  'sb_publishable_OxVCBTAZ4IfQXNV1X4Ta4g_zFLAUCX1'
);

async function check() {
  const { data, error } = await supabase.from('servicios').select('*');
  if (error) console.error(error);
  console.log(`Found ${data?.length || 0} rows in servicios table in Supabase!`);
  if (data?.length > 0) {
    console.log(`First row: ${data[0].id} - ${data[0].cliente}`);
  }
}
check();
