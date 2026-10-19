import { env } from 'cloudflare:workers';
import { STARTER_SETTINGS,initialSettings,validateSettings } from './model-routing.mjs';
export async function readSettings(){
  if(!env.DB)throw new Error('DATABASE_UNAVAILABLE');
  await env.DB.prepare('INSERT OR IGNORE INTO support_settings (id, data, revision) VALUES (?, ?, ?)').bind('main',JSON.stringify({...STARTER_SETTINGS,setup_version:1}),1).run();
  let row=await env.DB.prepare('SELECT data, revision FROM support_settings WHERE id = ?').bind('main').first<{data:string;revision:number}>();
  if(!row)throw new Error('DATABASE_UNAVAILABLE');
  const current=JSON.parse(row.data);
  if(current.setup_version!==1){
    await env.DB.prepare('UPDATE support_settings SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(JSON.stringify(initialSettings(current)),'main',row.revision).run();
    row=await env.DB.prepare('SELECT data, revision FROM support_settings WHERE id = ?').bind('main').first<{data:string;revision:number}>();
    if(!row)throw new Error('DATABASE_UNAVAILABLE');
  }
  return {settings:validateSettings(JSON.parse(row.data)),revision:row.revision};
}
export async function writeSettings(value:unknown,revision:number){
  const settings=validateSettings(value);if(!Number.isSafeInteger(revision)||revision<1)throw new Error('INVALID_REVISION');
  const result=await env.DB!.prepare('UPDATE support_settings SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(JSON.stringify({...settings,setup_version:1}),'main',revision).run();
  if(result.meta.changes!==1)throw new Error('SETTINGS_CONFLICT');return readSettings();
}
