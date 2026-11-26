import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { StoreService } from './store.service';

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_PHOTO = 20 * 1024 * 1024;
const VISIBILITY = new Set(['public', 'friends', 'private']);

@Controller()
export class PhotosController {
  constructor(private readonly s: StoreService) {}

  private ensure() {
    this.s.db.exec(`
      CREATE TABLE IF NOT EXISTS photo_albums(
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '', visibility TEXT NOT NULL DEFAULT 'public',
        cover_photo_id INTEGER, sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS photos(
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, album_id INTEGER,
        url TEXT NOT NULL, thumb_url TEXT NOT NULL, mime TEXT NOT NULL, original_name TEXT NOT NULL,
        width INTEGER, height INTEGER, size INTEGER NOT NULL, caption TEXT NOT NULL DEFAULT '',
        tags_json TEXT NOT NULL DEFAULT '[]', geo_json TEXT, visibility TEXT NOT NULL DEFAULT 'public',
        status TEXT NOT NULL DEFAULT 'ready', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS photo_tags(
        id INTEGER PRIMARY KEY AUTOINCREMENT, photo_id INTEGER NOT NULL, tagged_user_id INTEGER NOT NULL,
        requested_by INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL, UNIQUE(photo_id, tagged_user_id)
      );
      CREATE TABLE IF NOT EXISTS photo_reactions(
        id INTEGER PRIMARY KEY AUTOINCREMENT, photo_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
        kind TEXT NOT NULL DEFAULT 'like', created_at TEXT NOT NULL, UNIQUE(photo_id,user_id)
      );
      CREATE TABLE IF NOT EXISTS photo_comments(
        id INTEGER PRIMARY KEY AUTOINCREMENT, photo_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
        body TEXT NOT NULL, parent_id INTEGER, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS photo_views(
        id INTEGER PRIMARY KEY AUTOINCREMENT, photo_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL, UNIQUE(photo_id,user_id)
      );
      CREATE INDEX IF NOT EXISTS photos_user_idx ON photos(user_id,created_at);
      CREATE INDEX IF NOT EXISTS photos_album_idx ON photos(album_id,created_at);
    `);
  }
  private user(req: any) { return this.s.auth(req); }
  private json(value: any, fallback: any) { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
  private friend(a: number, b: number) {
    return a > 0 && b > 0 && Boolean(this.s.db.prepare(`SELECT 1 FROM friendships WHERE status='accepted' AND ((requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?))`).get(a,b,b,a));
  }
  private canView(row: any, viewer: number) {
    return Boolean(row && (row.user_id === viewer || row.visibility === 'public' || (row.visibility === 'friends' && this.friend(row.user_id, viewer))));
  }
  private canAlbum(row: any, viewer: number) {
    return Boolean(row && (row.user_id === viewer || row.visibility === 'public' || (row.visibility === 'friends' && this.friend(row.user_id, viewer))));
  }
  private photo(row: any, viewer: number) {
    if (!row || !this.canView(row, viewer)) return null;
    const tags = this.s.db.prepare(`SELECT t.id,u.id userId,u.username,u.display_name displayName,t.status FROM photo_tags t JOIN users u ON u.id=t.tagged_user_id WHERE t.photo_id=? AND (t.status='accepted' OR t.tagged_user_id=? OR ?=?)`).all(row.id, viewer, viewer, row.user_id);
    const likesRow=this.s.db.prepare('SELECT COUNT(*) n FROM photo_reactions WHERE photo_id=?').get(row.id) as any; const likedRow=this.s.db.prepare('SELECT 1 FROM photo_reactions WHERE photo_id=? AND user_id=?').get(row.id,viewer) as any; const commentsRow=this.s.db.prepare('SELECT COUNT(*) n FROM photo_comments WHERE photo_id=?').get(row.id) as any; const viewsRow=this.s.db.prepare('SELECT COUNT(*) n FROM photo_views WHERE photo_id=?').get(row.id) as any;
    return { id: row.id, userId: row.user_id, albumId: row.album_id, url: row.url, thumbUrl: row.thumb_url, mime: row.mime, originalName: row.original_name, width: row.width, height: row.height, size: row.size, caption: row.caption, tags, geo: this.json(row.geo_json, null), visibility: row.visibility, createdAt: row.created_at, updatedAt: row.updated_at, likes: Number(likesRow?.n||0), liked: Boolean(likedRow), comments: Number(commentsRow?.n||0), views: Number(viewsRow?.n||0) };
  }
  private album(row: any, viewer: number) {
    if (!this.canAlbum(row, viewer)) return null;
    const countRow=this.s.db.prepare('SELECT COUNT(*) n FROM photos WHERE album_id=? AND status=\'ready\'').get(row.id) as any; const count = Number(countRow?.n||0);
    return { id: row.id, userId: row.user_id, name: row.name, description: row.description, visibility: row.visibility, coverPhotoId: row.cover_photo_id, sortOrder: row.sort_order, photoCount: count, createdAt: row.created_at, updatedAt: row.updated_at };
  }

  @Get('photo-albums') albums(@Req() req: any, @Query('username') username?: string) {
    this.ensure(); const viewer = this.user(req); const owner = username ? this.s.db.prepare('SELECT id FROM users WHERE username=?').get(username) as any : null; const userId = owner?.id || viewer;
    if (!userId) return { items: [] };
    const rows = this.s.db.prepare('SELECT * FROM photo_albums WHERE user_id=? ORDER BY sort_order ASC,created_at DESC').all(userId) as any[];
    return { items: rows.map(x => this.album(x, viewer)).filter(Boolean) };
  }
  @Post('photo-albums') createAlbum(@Req() req: any, @Body() body: any) {
    this.ensure(); const user = this.user(req); if (!user) return { error: 'Требуется вход', code: 'UNAUTHORIZED' };
    const name = String(body?.name || '').trim().slice(0,100); if (!name) return { error: 'Название альбома обязательно', code: 'VALIDATION_ERROR' };
    const visibility = VISIBILITY.has(body?.visibility) ? body.visibility : 'public'; const now = this.s.now();
    const q = this.s.db.prepare('INSERT INTO photo_albums(user_id,name,description,visibility,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(user,name,String(body?.description||'').slice(0,500),visibility,now,now);
    return this.album(this.s.db.prepare('SELECT * FROM photo_albums WHERE id=?').get(q.lastInsertRowid), user);
  }
  @Patch('photo-albums/:id') updateAlbum(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.ensure(); const user = this.user(req); const row = this.s.db.prepare('SELECT * FROM photo_albums WHERE id=? AND user_id=?').get(+id,user) as any; if (!row) return { error: 'Альбом не найден', code: 'NOT_FOUND' };
    const visibility = VISIBILITY.has(body?.visibility) ? body.visibility : row.visibility; const now = this.s.now(); this.s.db.prepare('UPDATE photo_albums SET name=?,description=?,visibility=?,sort_order=?,updated_at=? WHERE id=?').run(String(body?.name ?? row.name).trim().slice(0,100),String(body?.description ?? row.description).slice(0,500),visibility,Number(body?.sortOrder ?? row.sort_order),now,+id);
    return this.album(this.s.db.prepare('SELECT * FROM photo_albums WHERE id=?').get(+id),user);
  }
  @Delete('photo-albums/:id') deleteAlbum(@Req() req: any, @Param('id') id: string) {
    this.ensure(); const user = this.user(req); const row = this.s.db.prepare('SELECT * FROM photo_albums WHERE id=? AND user_id=?').get(+id,user) as any; if (!row) return { error: 'Альбом не найден', code: 'NOT_FOUND' };
    this.s.db.prepare('UPDATE photos SET album_id=NULL,updated_at=? WHERE album_id=?').run(this.s.now(),+id); this.s.db.prepare('DELETE FROM photo_albums WHERE id=?').run(+id); return { ok:true };
  }

  @Post('photos/upload')
  @UseInterceptors(FilesInterceptor('files', 20, { limits: { fileSize: MAX_PHOTO } }))
  async upload(@Req() req: any, @Query('albumId') albumId: string, @UploadedFiles() files: any[]) {
    this.ensure(); const user = this.user(req); if (!user) return { error: 'Требуется вход', code: 'UNAUTHORIZED' }; if (!files?.length) return { error: 'Выберите фотографии', code: 'VALIDATION_ERROR' };
    const album = albumId ? this.s.db.prepare('SELECT * FROM photo_albums WHERE id=? AND user_id=?').get(+albumId,user) as any : null; if (albumId && !album) return { error:'Альбом не найден', code:'NOT_FOUND' };
    mkdirSync(join(process.cwd(),'uploads','photos'), { recursive:true }); const created:any[] = [];
    for (const file of files) {
      if (!PHOTO_TYPES.has(file.mimetype) || file.size > MAX_PHOTO) continue;
      const base = randomBytes(18).toString('hex'); const ext = file.mimetype === 'image/png' ? 'png' : 'jpg'; const main = `${base}.${ext}`; const thumb = `${base}-thumb.jpg`;
      try {
        const image = sharp(file.buffer, { failOn: 'error' }); const meta = await image.metadata();
        await image.rotate().resize({ width:2048, height:2048, fit:'inside', withoutEnlargement:true }).jpeg({ quality:88, progressive:true }).toFile(join(process.cwd(),'uploads','photos',main));
        await sharp(file.buffer, { failOn:'error' }).rotate().resize({ width:480, height:480, fit:'cover' }).jpeg({ quality:80, progressive:true }).toFile(join(process.cwd(),'uploads','photos',thumb));
        const now=this.s.now(); const q=this.s.db.prepare('INSERT INTO photos(user_id,album_id,url,thumb_url,mime,original_name,width,height,size,visibility,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(user,album?.id||null,`/uploads/photos/${main}`,`/uploads/photos/${thumb}`,'image/jpeg',String(file.originalname).slice(0,180),meta.width||null,meta.height||null,file.size,album?.visibility||'public','ready',now,now);
        const row=this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(q.lastInsertRowid); created.push(this.photo(row,user));
      } catch { /* malformed image is rejected, never stored */ }
    }
    return { items:created, rejected:files.length-created.length };
  }
  @Get('photos') list(@Req() req: any, @Query('username') username?: string, @Query('albumId') albumId?: string, @Query('tagged') tagged?: string) {
    this.ensure(); const viewer=this.user(req); const owner=username ? this.s.db.prepare('SELECT id FROM users WHERE username=?').get(username) as any : null; const userId=owner?.id;
    let rows:any[];
    if (tagged==='1') rows=this.s.db.prepare('SELECT p.* FROM photos p JOIN photo_tags t ON t.photo_id=p.id WHERE t.tagged_user_id=? AND t.status=\'accepted\' ORDER BY p.created_at DESC').all(userId||viewer) as any[];
    else if (albumId) rows=this.s.db.prepare('SELECT * FROM photos WHERE album_id=? ORDER BY created_at DESC').all(+albumId) as any[];
    else if (userId) rows=this.s.db.prepare('SELECT * FROM photos WHERE user_id=? ORDER BY created_at DESC').all(userId) as any[];
    else rows=this.s.db.prepare('SELECT * FROM photos ORDER BY created_at DESC LIMIT 100').all() as any[];
    return { items:rows.map(x=>this.photo(x,viewer)).filter(Boolean) };
  }
  @Post('photos/:id/edit')
  async edit(@Req() req:any,@Param('id') id:string,@Body() body:any) {
    this.ensure(); const user=this.user(req); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=? AND user_id=?').get(+id,user) as any; if(!row)return {error:'Фото не найдено',code:'NOT_FOUND'};
    const source=join(process.cwd(),row.url.replace(/^\//,'')); if(!existsSync(source))return {error:'Файл не найден',code:'NOT_FOUND'};
    const dir=join(process.cwd(),'uploads','photos'); const temp=join(dir,`edit-${randomBytes(12).toString('hex')}.jpg`); const thumbTemp=join(dir,`edit-${randomBytes(12).toString('hex')}-thumb.jpg`);
    try { let image=sharp(source,{failOn:'error'}); const rotate=Number(body?.rotate||0); if([90,180,270,-90,-180,-270].includes(rotate))image=image.rotate(rotate); const crop=body?.crop; if(crop&&Number(crop.width)>0&&Number(crop.height)>0)image=image.extract({left:Math.max(0,Number(crop.left)||0),top:Math.max(0,Number(crop.top)||0),width:Number(crop.width),height:Number(crop.height)}); if(body?.filter==='grayscale')image=image.grayscale(); if(body?.filter==='sepia')image=image.tint('#704214'); await image.jpeg({quality:88,progressive:true}).toFile(temp); await sharp(temp).resize({width:480,height:480,fit:'cover'}).jpeg({quality:80,progressive:true}).toFile(thumbTemp); renameSync(temp,source); renameSync(thumbTemp,join(process.cwd(),row.thumb_url.replace(/^\//,''))); const meta=await sharp(source).metadata(); this.s.db.prepare('UPDATE photos SET width=?,height=?,updated_at=? WHERE id=?').run(meta.width||null,meta.height||null,this.s.now(),+id); return this.photo(this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id),user);
    } catch { try{unlinkSync(temp)}catch{} try{unlinkSync(thumbTemp)}catch{} return {error:'Не удалось обработать изображение',code:'INVALID_IMAGE'}; }
  }
  @Get('photos/:id') get(@Req() req:any,@Param('id') id:string) { this.ensure(); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id); const item=this.photo(row,this.user(req)); return item||{error:'Фото недоступно',code:'FORBIDDEN'}; }
  @Patch('photos/:id') update(@Req() req:any,@Param('id') id:string,@Body() body:any) {
    this.ensure(); const user=this.user(req); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=? AND user_id=?').get(+id,user) as any; if(!row)return {error:'Фото не найдено',code:'NOT_FOUND'};
    const visibility=VISIBILITY.has(body?.visibility)?body.visibility:row.visibility; const geo=body?.geo===null?null:(body?.geo?JSON.stringify({lat:Number(body.geo.lat),lng:Number(body.geo.lng),label:String(body.geo.label||'').slice(0,120)}):row.geo_json); const tags=Array.isArray(body?.tags)?JSON.stringify(body.tags.map((x:any)=>Number(x)).filter(Boolean)):row.tags_json;
    this.s.db.prepare('UPDATE photos SET caption=?,visibility=?,geo_json=?,tags_json=?,updated_at=? WHERE id=?').run(String(body?.caption??row.caption).slice(0,1000),visibility,geo,tags,this.s.now(),+id); return this.photo(this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id),user);
  }
  @Post('photo-albums/:id/photos') move(@Req() req:any,@Param('id') id:string,@Body() body:any) { this.ensure(); const user=this.user(req); const album=this.s.db.prepare('SELECT * FROM photo_albums WHERE id=? AND user_id=?').get(+id,user) as any; if(!album)return {error:'Альбом не найден',code:'NOT_FOUND'}; const ids=Array.isArray(body?.photoIds)?body.photoIds.map(Number).filter(Boolean):[]; const q=this.s.db.prepare('UPDATE photos SET album_id=?,visibility=?,updated_at=? WHERE id=? AND user_id=?'); const tx=this.s.db.transaction(()=>ids.forEach((photoId:number)=>q.run(+id,album.visibility,this.s.now(),photoId,user)));tx(); return {ok:true,moved:ids.length}; }
  @Post('photo-albums/:id/cover') cover(@Req() req:any,@Param('id') id:string,@Body() body:any) { this.ensure(); const user=this.user(req); const ok=this.s.db.prepare('SELECT 1 FROM photos WHERE id=? AND album_id=? AND user_id=?').get(Number(body?.photoId),+id,user); if(!ok)return {error:'Фото не принадлежит альбому',code:'VALIDATION_ERROR'}; this.s.db.prepare('UPDATE photo_albums SET cover_photo_id=?,updated_at=? WHERE id=? AND user_id=?').run(Number(body.photoId),this.s.now(),+id,user); return {ok:true}; }
  @Post('photos/:id/view') view(@Req() req:any,@Param('id') id:string) { this.ensure(); const user=this.user(req); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id); if(!this.canView(row,user))return {error:'Фото недоступно',code:'FORBIDDEN'}; if(user)this.s.db.prepare('INSERT OR IGNORE INTO photo_views(photo_id,user_id,created_at) VALUES(?,?,?)').run(+id,user,this.s.now()); return {ok:true}; }
  @Post('photos/:id/react') react(@Req() req:any,@Param('id') id:string) { this.ensure(); const user=this.user(req); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id); if(!user||!this.canView(row,user))return {error:'Недоступно',code:'FORBIDDEN'}; const old=this.s.db.prepare('SELECT 1 FROM photo_reactions WHERE photo_id=? AND user_id=?').get(+id,user); old?this.s.db.prepare('DELETE FROM photo_reactions WHERE photo_id=? AND user_id=?').run(+id,user):this.s.db.prepare('INSERT INTO photo_reactions(photo_id,user_id,created_at) VALUES(?,?,?)').run(+id,user,this.s.now()); return {liked:!old}; }
  @Get('photos/:id/comments') comments(@Req() req:any,@Param('id') id:string) { this.ensure(); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id); if(!this.canView(row,this.user(req)))return {error:'Недоступно',code:'FORBIDDEN'}; return {items:this.s.db.prepare('SELECT c.id,c.body,c.parent_id parentId,c.created_at createdAt,u.id userId,u.username,u.display_name displayName FROM photo_comments c JOIN users u ON u.id=c.user_id WHERE c.photo_id=? ORDER BY c.created_at ASC').all(+id)}; }
  @Post('photos/:id/comments') addComment(@Req() req:any,@Param('id') id:string,@Body() body:any) { this.ensure(); const user=this.user(req); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id); const text=String(body?.body||'').trim().slice(0,2000); if(!user||!this.canView(row,user)||!text)return {error:'Комментарий недоступен',code:'VALIDATION_ERROR'}; const q=this.s.db.prepare('INSERT INTO photo_comments(photo_id,user_id,body,parent_id,created_at) VALUES(?,?,?,?,?)').run(+id,user,text,body?.parentId?Number(body.parentId):null,this.s.now()); return {id:Number(q.lastInsertRowid),body:text}; }
  @Post('photos/:id/share') share(@Req() req:any,@Param('id') id:string,@Body() body:any) { this.ensure(); const user=this.user(req); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id) as any; if(!user||!this.canView(row,user))return {error:'Недоступно',code:'FORBIDDEN'}; const q=this.s.db.prepare('INSERT INTO posts(author_id,body,visibility,created_at) VALUES(?,?,?,?)').run(user,`${String(body?.text||'').slice(0,500)}\n${row.url}`,'public',this.s.now()); return {postId:Number(q.lastInsertRowid)}; }
  @Post('photos/:id/tag-requests') tag(@Req() req:any,@Param('id') id:string,@Body() body:any) { this.ensure(); const user=this.user(req); const tagged=Number(body?.userId); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id) as any; if(!user||!row||row.user_id!==user||!this.s.user(tagged))return {error:'Нельзя отметить пользователя',code:'FORBIDDEN'}; const now=this.s.now(); this.s.db.prepare('INSERT INTO photo_tags(photo_id,tagged_user_id,requested_by,status,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(photo_id,tagged_user_id) DO UPDATE SET status=\'pending\',updated_at=excluded.updated_at').run(+id,tagged,user,'pending',now,now); return {ok:true,status:'pending'}; }
  @Post('photo-tags/:id/decision') tagDecision(@Req() req:any,@Param('id') id:string,@Body() body:any) { this.ensure(); const user=this.user(req); const tag=this.s.db.prepare('SELECT * FROM photo_tags WHERE id=? AND tagged_user_id=?').get(+id,user) as any; if(!tag)return {error:'Запрос не найден',code:'NOT_FOUND'}; const status=body?.accept?'accepted':'rejected'; this.s.db.prepare('UPDATE photo_tags SET status=?,updated_at=? WHERE id=?').run(status,this.s.now(),+id); return {ok:true,status}; }
  @Get('photos/:id/download') download(@Req() req:any,@Param('id') id:string,@Res() res:any) { this.ensure(); const row=this.s.db.prepare('SELECT * FROM photos WHERE id=?').get(+id) as any; const user=this.user(req); if(!this.canView(row,user))return res.status(403).json({error:'Фото недоступно',code:'FORBIDDEN'}); const file=join(process.cwd(),row.url.replace(/^\//,'')); if(!existsSync(file))return res.status(404).json({error:'Файл не найден',code:'NOT_FOUND'}); res.setHeader('Content-Type',row.mime);res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`);return res.send(readFileSync(file)); }
}
