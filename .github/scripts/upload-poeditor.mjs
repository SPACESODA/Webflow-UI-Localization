import fs from 'fs/promises';
import path from 'path';

const token = process.env.POEDITOR_API_TOKEN;
const projectId = process.env.POEDITOR_PROJECT_ID;
const exportType = process.env.POEDITOR_EXPORT_TYPE || 'key_value_json';
const languagesEnv = process.env.POEDITOR_LANGUAGES?.trim();

if (!token || !projectId) {
  throw new Error('POEDITOR_API_TOKEN and POEDITOR_PROJECT_ID must be set.');
}

const defaultLanguages = [
  'ja=src/locales/ja.json',
  'zh-TW=src/locales/zh-TW.json',
  'zh-CN=src/locales/zh-CN.json',
  'ko=src/locales/ko.json',
  'fr=src/locales/fr.json',
  'it=src/locales/it.json',
  'de=src/locales/de.json',
  'es=src/locales/es.json'
].join(',');

if (!languagesEnv) {
  console.log(`POEDITOR_LANGUAGES not set, using defaults: ${defaultLanguages}`);
}

const languageEntries = (languagesEnv || defaultLanguages)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [code, filePath] = entry.split('=');
    if (!code || !filePath) {
      throw new Error(`Invalid language entry "${entry}". Use "code=path" format.`);
    }
    return { code, filePath };
  });

async function uploadLocale(code, filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(resolved, 'utf8');

  // Validate JSON before upload
  JSON.parse(content);

  const form = new FormData();
  form.set('api_token', token);
  form.set('id', projectId);
  form.set('language', code);
  form.set('overwrite', '1'); // add/update, no deletions
  form.set('sync_terms', '0');
  form.set('updating', 'terms_translations'); // add terms and translations
  form.set('type', exportType);
  form.append('file', new Blob([content], { type: 'application/json' }), path.basename(filePath));

  const response = await fetch('https://api.poeditor.com/v2/projects/upload', {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    throw new Error(`Upload request failed for ${code}: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data?.response?.status !== 'success') {
    throw new Error(`Upload API error for ${code}: ${JSON.stringify(data)}`);
  }
}

async function run() {
  for (const { code, filePath } of languageEntries) {
    console.log(`Uploading ${code} <- ${filePath}`);
    await uploadLocale(code, filePath);
  }
  console.log('Locales uploaded to POEditor (add/overwrite only, no sync).');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
