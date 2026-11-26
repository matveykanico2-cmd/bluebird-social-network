import { Controller, Get, Param, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { StoreService } from './store.service';

const ALLOWED = new Set([
  'image/jpeg','image/png','image/webp','image/gif','image/avif',
  'video/mp4','video/webm','audio/mpeg','audio/mp4','audio/ogg','audio/wav',
  'application/pdf','text/plain','text/markdown','application/zip',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const MAX = 50 * 1024 * 1024;

@Controller('files')
export class FilesController {
  constructor(private readonly s: StoreService) {}
  private ensure() { this.s.db.exec(`CREATE TABLE IF NOT EXISTS uploaded_files(
    id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL, scope TEXT NOT NULL,
    scope_id INTEGER, original_name TEXT NOT NULL, stored_name TEXT NOT NULL, mime TEXT NOT NULL,
    size INTEGER NOT NULL, sha256 TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'clean',
    version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
  ); CREATE INDEX IF NOT EXISTS uploaded_files_scope ON uploaded_files(scope,scope_id);`); }
  private user(req: any) { return this.s.auth(req); }
  private canRead(row: any, user: number) {
    if (!row || !user) return false;
    if (row.owner_id === user) return true;
    if (row.scope === 'post') return Boolean(this.s.db.prepare("SELECT 1 FROM posts WHERE id=? AND (visibility='public' OR author_id=?)").get(row.scope_id, user));
    if (row.scope === 'profile') return Boolean(this.s.db.prepare('SELECT 1 FROM users WHERE id=?').get(row.scope_id));
    if (row.scope === 'chat') return Boolean(this.s.db.prepare('SELECT 1 FROM messages WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)').get(user,row.scope_id,row.scope_id,user));
    return false;
  }
  private safeName(name: string) { return basename(name).replace(/[^\p{L}\p{N}._-]/gu, '_').slice(0, 180) || 'file'; }
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@Req() req: any, @Query('scope') scope: string, @Query('scopeId') scopeId: string, @UploadedFile() file: any) {
    this.ensure(); const user = this.user(req);
    if (!user) return { error: 'Требуется вход', code: 'UNAUTHORIZED' };
    if (!file || !ALLOWED.has(file.mimetype) || file.size > MAX) return { error: 'Неподдерживаемый тип или размер файла (максимум 50 МБ)', code: 'INVALID_FILE' };
    const allowedScope = ['chat','post','profile'].includes(scope) ? scope : 'chat';
    const target = Number(scopeId || 0) || null;
    if (allowedScope === 'post' && !this.s.db.prepare('SELECT 1 FROM posts WHERE id=? AND author_id=?').get(target,user)) return { error: 'Нет доступа к публикации', code: 'FORBIDDEN' };
    if (allowedScope === 'profile' && target !== user) return { error: 'Нет доступа к профилю', code: 'FORBIDDEN' };
    if (allowedScope === 'chat' && target && !this.s.user(target)) return { error: 'Получатель не найден', code: 'NOT_FOUND' };
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const text = file.mimetype.startsWith('text/') ? file.buffer.toString('utf8',0,100_000) : '';
    const suspicious = /<script\b|javascript:|\bvirus\b|\beicar\b/i.test(text);
    const status = suspicious ? 'quarantined' : 'clean';
    const stored = `${randomBytes(18).toString('hex')}${extname(this.safeName(file.originalname)).toLowerCase()}`;
    mkdirSync(join(process.cwd(),'uploads','files'), { recursive: true });
    writeFileSync(join(process.cwd(),'uploads','files',stored), file.buffer);
    const q = this.s.db.prepare('INSERT INTO uploaded_files(owner_id,scope,scope_id,original_name,stored_name,mime,size,sha256,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(user,allowedScope,target,this.safeName(file.originalname),stored,file.mimetype,file.size,hash,status,this.s.now());
    return { id:Number(q.lastInsertRowid), name:this.safeName(file.originalname), mime:file.mimetype, size:file.size, status, url:`/files/${Number(q.lastInsertRowid)}/preview` };
  }
  @Get(':id/preview')
  preview(@Req() req:any,@Param('id') id:string,@Res() res:any) {
    this.ensure(); const row=this.s.db.prepare('SELECT * FROM uploaded_files WHERE id=?').get(+id) as any; const user=this.user(req);
    if (!this.canRead(row,user) || row.status !== 'clean') return res.status(403).json({error:'Файл недоступен',code:'FORBIDDEN'});
    const path=join(process.cwd(),'uploads','files',row.stored_name); if (!existsSync(path)) return res.status(404).json({error:'Файл не найден',code:'NOT_FOUND'});
    res.setHeader('Content-Type', row.mime); res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(row.original_name)}`); return res.send(readFileSync(path));
  }
  @Get(':id/download')
  download(@Req() req:any,@Param('id') id:string,@Res() res:any) {
    this.ensure(); const row=this.s.db.prepare('SELECT * FROM uploaded_files WHERE id=?').get(+id) as any; const user=this.user(req);
    if (!this.canRead(row,user) || row.status !== 'clean') return res.status(403).json({error:'Файл недоступен',code:'FORBIDDEN'});
    const path=join(process.cwd(),'uploads','files',row.stored_name); if (!existsSync(path)) return res.status(404).json({error:'Файл не найден',code:'NOT_FOUND'});
    res.setHeader('Content-Type', row.mime); res.setHeader('Content-Length', row.size); res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`); return res.send(readFileSync(path));
  }
  @Get(':id')
  info(@Req() req:any,@Param('id') id:string) { this.ensure(); const row=this.s.db.prepare('SELECT id,owner_id ownerId,scope,scope_id scopeId,original_name name,mime,size,sha256,status,version,created_at createdAt FROM uploaded_files WHERE id=?').get(+id) as any; return this.canRead(row,this.user(req)) ? {...row,previewUrl:`/files/${id}/preview`,downloadUrl:`/files/${id}/download`} : {error:'Файл недоступен',code:'FORBIDDEN'}; }
  @Post(':id/version')
  @UseInterceptors(FileInterceptor('file'))
  version(@Req() req:any,@Param('id') id:string,@UploadedFile() file:any) {
    this.ensure(); const user=this.user(req); const old=this.s.db.prepare('SELECT * FROM uploaded_files WHERE id=?').get(+id) as any;
    if (!user || !old || old.owner_id!==user) return {error:'Недостаточно прав',code:'FORBIDDEN'};
    if (!file || !ALLOWED.has(file.mimetype) || file.size>MAX) return {error:'Неподдерживаемый тип или размер файла',code:'INVALID_FILE'};
    const stored=`${randomBytes(18).toString('hex')}${extname(this.safeName(file.originalname)).toLowerCase()}`; mkdirSync(join(process.cwd(),'uploads','files'),{recursive:true}); writeFileSync(join(process.cwd(),'uploads','files',stored),file.buffer);
    const hash=createHash('sha256').update(file.buffer).digest('hex'); const q=this.s.db.prepare('INSERT INTO uploaded_files(owner_id,scope,scope_id,original_name,stored_name,mime,size,sha256,status,version,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(user,old.scope,old.scope_id,this.safeName(file.originalname),stored,file.mimetype,file.size,hash,'clean',old.version+1,this.s.now()); return {id:Number(q.lastInsertRowid),version:old.version+1};
  }
}
