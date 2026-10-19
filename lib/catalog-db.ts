import { env } from 'cloudflare:workers';
import seed from './catalog-seed.json';
import { validateCatalog } from './catalog-domain.mjs';

function database() { if(!env.DB)throw new Error('CATALOG_UNAVAILABLE');return env.DB; }
export async function readCatalog() {
  const db=database();
  let row=await db.prepare('SELECT data, revision, updated_at FROM catalogs WHERE id = ?').bind('main').first<{data:string;revision:number;updated_at:string}>();
  if(!row){
    // Seed is deliberately outside schema migrations. Never replaces existing data.
    await db.prepare('INSERT OR IGNORE INTO catalogs (id, data, revision, updated_at) VALUES (?, ?, ?, ?)').bind('main',JSON.stringify(validateCatalog(seed)),1,new Date().toISOString()).run();
    row=await db.prepare('SELECT data, revision, updated_at FROM catalogs WHERE id = ?').bind('main').first<{data:string;revision:number;updated_at:string}>();
  }
  if(!row)throw new Error('CATALOG_UNAVAILABLE');
  return {catalog:validateCatalog(JSON.parse(row.data)),revision:row.revision,updated_at:row.updated_at};
}
export async function writeCatalog(input:unknown,revision:number) {
  const catalog=validateCatalog(input);
  if(!Number.isSafeInteger(revision)||revision<1)throw new Error('INVALID_REVISION');
  const result=await database().prepare('UPDATE catalogs SET data = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(JSON.stringify(catalog),new Date().toISOString(),'main',revision).run();
  if(result.meta.changes!==1)throw new Error('CATALOG_CONFLICT');
  return readCatalog();
}
