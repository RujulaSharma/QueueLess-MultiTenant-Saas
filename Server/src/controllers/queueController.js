const Queue = require("../models/Queue");
const Service = require("../models/Service");

const joinQueue = async (req, res, next) => {
  try {
    const { businessId, serviceId, priority = "NORMAL", notes = "" } = req.body;
    if (!businessId || !serviceId) return res.status(400).json({ success:false, message:"Business and service are required" });
    const service = await Service.findOne({ _id: serviceId, business: businessId, isActive:true });
    if (!service) return res.status(404).json({ success:false, message:"Service not found or inactive" });
    const existing = await Queue.findOne({ customer:req.user._id, service:serviceId, status:{ $in:["WAITING","CALLED","SERVING"] } });
    if (existing) return res.status(409).json({ success:false, message:"You are already in this queue", queue:existing });
    const latest = await Queue.findOne({ business:businessId, service:serviceId }).sort({ tokenNumber:-1 });
    const tokenNumber = latest ? latest.tokenNumber + 1 : 1;
    const waitingCount = await Queue.countDocuments({ business:businessId, service:serviceId, status:"WAITING" });
    const queueEntry = await Queue.create({ business:businessId, service:serviceId, customer:req.user._id, tokenNumber, position:waitingCount+1, estimatedWaitTime:(waitingCount+1)*service.averageDuration, priority, notes });
    const populated = await Queue.findById(queueEntry._id).populate("customer","name email").populate("service","name averageDuration");
    req.app.get("io").to(`business:${businessId}`).emit("queue:updated", { type:"JOINED", queue:populated });
    res.status(201).json({ success:true, message:"Successfully joined the queue", queue:populated });
  } catch (error) { next(error); }
};

const getMyQueue = async (req,res,next) => {
  try { const queue=await Queue.find({ customer:req.user._id, status:{ $in:["WAITING","CALLED","SERVING"] }}).populate("business","name category").populate("service","name averageDuration").sort({createdAt:-1}); res.json({success:true,count:queue.length,queue}); } catch(e){next(e);} };
const getBusinessQueue = async (req,res,next) => {
  try { const queue=await Queue.find({business:req.params.businessId,status:{ $in:["WAITING","CALLED","SERVING"] }}).populate("customer","name email").populate("service","name averageDuration").sort({priority:-1,joinedAt:1}); res.json({success:true,count:queue.length,queue}); } catch(e){next(e);} };
const cancelQueue = async (req,res,next) => {
  try { const queue=await Queue.findOne({_id:req.params.id,customer:req.user._id,status:{ $in:["WAITING","CALLED"] }}); if(!queue)return res.status(404).json({success:false,message:"Active queue entry not found"}); queue.status="CANCELLED"; await queue.save(); req.app.get("io").to(`business:${queue.business}`).emit("queue:updated",{type:"CANCELLED",queue}); res.json({success:true,message:"Queue entry cancelled successfully",queue}); } catch(e){next(e);} };
module.exports={joinQueue,getMyQueue,getBusinessQueue,cancelQueue};
