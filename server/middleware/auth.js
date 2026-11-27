import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export async function auth(req,res,next){try{const token=req.cookies.token||req.headers.authorization?.replace('Bearer ','');if(!token)return res.status(401).json({success:false,message:'Please sign in'});const data=jwt.verify(token,process.env.JWT_SECRET);req.user=await User.findById(data.id);if(!req.user)return res.status(401).json({success:false,message:'Account not found'});next()}catch{return res.status(401).json({success:false,message:'Invalid or expired session'})}}
export async function optionalAuth(req,res,next){try{const token=req.cookies.token||req.headers.authorization?.replace('Bearer ','');if(token){const data=jwt.verify(token,process.env.JWT_SECRET);req.user=await User.findById(data.id)}}catch{}next()}
export const roles=(...allowed)=>(req,res,next)=>allowed.includes(req.user.role)?next():res.status(403).json({success:false,message:'You do not have access to this action'});
export function requireAdmin(req,res,next){return auth(req,res,()=>{if(req.user?.role!=='admin')return res.status(403).json({success:false,message:'Super admin access is required'});next()})}
