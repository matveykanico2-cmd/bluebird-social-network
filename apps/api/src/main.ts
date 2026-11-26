import 'reflect-metadata'; import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common'; import { NestFactory } from '@nestjs/core'; import cookieParser = require('cookie-parser'); import express = require('express'); import { join } from 'node:path'; import { mkdirSync } from 'node:fs'; import { AppModule } from './app.module';

@Catch()
class ApiErrorFilter implements ExceptionFilter {
  catch(exception:any, host:ArgumentsHost){
    const response=host.switchToHttp().getResponse();
    if(exception?.name==='ZodError') { const first=exception.issues?.[0]; return response.status(400).json({error:first?.message||'Проверьте введённые данные',code:'VALIDATION_ERROR',issues:exception.issues}); }
    const status=typeof exception?.getStatus==='function'?exception.getStatus():500;
    const body=exception?.response;
    return response.status(status).json({error:typeof body==='string'?body:body?.message||exception?.message||'Внутренняя ошибка сервера',code:status>=500?'INTERNAL_ERROR':'REQUEST_ERROR'});
  }
}

async function bootstrap(){ const app=await NestFactory.create(AppModule); app.setGlobalPrefix('api'); app.useGlobalFilters(new ApiErrorFilter()); app.use(cookieParser()); const allowedOrigins=(process.env.WEB_ORIGIN||'http://localhost:5173').split(',').map(x=>x.trim()).filter(Boolean); app.getHttpAdapter().getInstance().use((req:any,res:any,next:any)=>{if(['POST','PUT','PATCH','DELETE'].includes(req.method)){const origin=req.get('origin');if(origin&& !allowedOrigins.includes(origin))return res.status(403).json({error:'Недопустимый источник запроса',code:'CSRF_ORIGIN_REJECTED'});const site=req.get('sec-fetch-site');if(!origin&&site==='cross-site')return res.status(403).json({error:'Недопустимый источник запроса',code:'CSRF_ORIGIN_REJECTED'});}next();}); mkdirSync(join(process.cwd(),'uploads'),{recursive:true}); app.getHttpAdapter().getInstance().use('/uploads',express.static(join(process.cwd(),'uploads'))); app.enableCors({origin:allowedOrigins,credentials:true}); app.enableShutdownHooks(); await app.listen(Number(process.env.PORT||3000)); }
bootstrap();
