import { z } from 'zod';

export const userSchema = z.object({ id:z.number(), username:z.string(), displayName:z.string(), bio:z.string().nullable(), avatarUrl:z.string().nullable(), online:z.boolean(), isFollowing:z.boolean().optional(), isFriend:z.boolean().optional() });
export const postSchema = z.object({ id:z.number(), author:userSchema, body:z.string(), createdAt:z.string(), reactionCount:z.number(), commentCount:z.number(), repostCount:z.number(), reacted:z.boolean(), bookmarked:z.boolean(), visibility:z.enum(['public','friends','private']) });
export const loginSchema = z.object({ login:z.string().min(3), password:z.string().min(6) });
export const registerSchema = z.object({ email:z.string().email(), username:z.string().min(3).max(24).regex(/^[a-z0-9_]+$/), displayName:z.string().min(2).max(80), password:z.string().min(6) });
export const createPostSchema = z.object({ body:z.string().min(1).max(5000), visibility:z.enum(['public','friends','private']).default('public') });
export const commentSchema = z.object({ body:z.string().min(1).max(1000), parentId:z.number().nullable().optional() });
export type User = z.infer<typeof userSchema>; export type Post = z.infer<typeof postSchema>;
