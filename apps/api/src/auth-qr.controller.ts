import {Body,Controller,Get,Post,Req,Res} from '@nestjs/common';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {StoreService} from './store.service';

type Entry={userId:number|null;expiresAt:number};
@Controller('auth/qr')
export class AuthQrController{
 private pending=new Map<string,Entry>();
 constructor(private readonly s:StoreService){}
 private clean(){const now=Date.now();for(const [token,row] of this.pending)if(row.expiresAt<now)this.pending.delete(token);}
 @Post('start') start(@Body() b:any){this.clean();const deviceId=z.string().trim().min(1).max(120).parse(b?.deviceId||'web');const token=randomBytes(24).toString('base64url');const expiresAt=Date.now()+90_000;this.pending.set(token,{userId:null,expiresAt});return {token,deviceId,expiresAt:new Date(expiresAt).toISOString(),url:`/qr-login?token=${token}`,qrPayload:`bluebird://auth/qr/${token}`};}
 @Post('confirm') confirm(@Req() req:any,@Body() b:any){this.clean();const user=this.s.auth(req);const token=z.string().trim().min(20).parse(b?.token);const row=this.pending.get(token);if(!user)return {error:'Требуется вход',code:'UNAUTHORIZED'};if(!row)return {error:'QR-токен истёк',code:'EXPIRED'};if(row.userId)return {error:'QR-токен уже подтверждён',code:'USED'};row.userId=user;return {ok:true};}
 @Get('poll') poll(@Req() req:any,@Res({passthrough:true}) res:any){this.clean();const token=z.string().trim().min(20).parse(req.query?.token);const row=this.pending.get(token);if(!row)return {status:'expired'};if(!row.userId)return {status:'pending'};this.s.setUser(res,row.userId);this.pending.delete(token);return {status:'authenticated',user:this.s.publicUser(row.userId)};}
}
