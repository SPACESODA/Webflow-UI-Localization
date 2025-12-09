import fs from 'fs/promises';
import path from 'path';

const token = process.env.POEDITOR_API_TOKEN;
const projectId = process.env.POEDITOR_PROJECT_ID;
const exportType = process.env.POEDITOR_EXPORT_TYPE || 'key_value_json';
const languagesEnv = process.env.POEDITOR_LANGUAGES;

if (!token || !projectId) {
  throw new Error('POEDITOR_API_TOKEN and POEDITOR_PROJECT_ID must be set.');
}

const languageEntries = (languagesEnv || 'ja=src/locales/ja.json,zh-TW=src/locales/zh-TW.json')
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

async function exportLocale(code) {
  const form = new URLSearchParams();
  form.set('api_token', token);
  form.set('id', projectId);
  form.set('language', code);
  form.set('type', exportType);

  const response = await fetch('https://api.poeditor.com/v2/projects/export', {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    throw new Error(`Export request failed for ${code}: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data?.response?.status !== 'success' || !data?.result?.url) {
    throw new Error(`Export API error for ${code}: ${JSON.stringify(data)}`);
  }

  return data.result.url;
}

async function downloadToFile(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} for ${url}`);
  }

  const content = await response.text();
  const resolved = path.resolve(process.cwd(), filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content);
}

async function run() {
  for (const { code, filePath } of languageEntries) {
    console.log(`Updating ${code} -> ${filePath}`);
    const url = await exportLocale(code);
    await downloadToFile(url, filePath);
  }
  console.log('Locales updated from POEditor.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
