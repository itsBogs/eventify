import mongoose from 'mongoose';
const lineSchema=new mongoose.Schema({ticketTypeId:mongoose.Schema.Types.ObjectId,name:String,quantity:Number,unitPrice:Number});
export default mongoose.model('Order',new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},event:{type:mongoose.Schema.Types.ObjectId,ref:'Event',required:true},items:[lineSchema],subtotal:Number,fees:Number,total:Number,status:{type:String,enum:['Pending','Paid','Cancelled','Refunded'],default:'Pending'},paymentReference:String},{timestamps:true}));
