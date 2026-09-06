const Queue = require("../models/Queue");
const { emitQueueUpdate } = require("../services/queueService");
const Service = require("../models/Service");
const Department = require("../models/Department");
const Doctor = require("../models/Doctor");

const joinQueue = async (req, res, next) => {
  try {
    const { businessId, serviceId, departmentId, priority = "NORMAL", notes = "" } = req.body;
    if (!businessId || (!serviceId && !departmentId)) return res.status(400).json({ success:false, message:"Hospital and department are required" });
    const department = departmentId ? await Department.findOne({ _id: departmentId, hospital: businessId, isActive: true }) : null;
    if (departmentId && !department) return res.status(404).json({ success:false, message:"Department not found" });
    const resolvedServiceId = serviceId || department?.legacyService;
    const service = await Service.findOne({ _id: resolvedServiceId, business: businessId, isActive:true });
    if (!service) return res.status(404).json({ success:false, message:"Department is not bookable yet" });
    const existing = await Queue.findOne({ customer:req.user._id, service:resolvedServiceId, department:department?._id || service.department || null, status:{ $in:["WAITING","CALLED","SERVING"] } });
    if (existing) return res.status(409).json({ success:false, message:"You are already in this queue", queue:existing });
    const latest = await Queue.findOne({ business:businessId, service:resolvedServiceId }).sort({ tokenNumber:-1 });
    const tokenNumber = latest ? latest.tokenNumber + 1 : 1;
    const waitingCount = await Queue.countDocuments({ business:businessId, service:resolvedServiceId, status:"WAITING" });
    const queueEntry = await Queue.create({ business:businessId, department:department?._id || service.department || null, service:resolvedServiceId, customer:req.user._id, tokenNumber, position:waitingCount+1, estimatedWaitTime:(waitingCount+1)*service.averageDuration, priority, notes });
    const populated = await Queue.findById(queueEntry._id).populate("customer","name email").populate("service","name averageDuration").populate("department","name code")
      .populate({ path:"doctor", populate:{ path:"user", select:"name email" } });
    req.app.get("io").to(`business:${businessId}`).emit("queue:updated", { type:"JOINED", queue:populated });
    res.status(201).json({ success:true, message:"Successfully joined the queue", queue:populated });
  } catch (error) { next(error); }
};

const getMyQueue = async (req,res,next) => {
  try {
    const queue = await Queue.find({
      customer:req.user._id,
      status:{ $in:["WAITING","CALLED","SERVING"] }
    })
      .populate("business","name category")
      .populate("service","name averageDuration")
      .populate("department","name code")
      .populate({ path:"doctor", populate:{ path:"user", select:"name email" } })
      .sort({createdAt:-1});
    res.json({success:true,count:queue.length,queue});
  } catch(e){next(e);}
};
const getBusinessQueue = async (req,res,next) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId || String(businessId) !== String(req.params.businessId)) {
      return res.status(403).json({ success:false, message:"You can only view your business queue" });
    }
    const queue = await Queue.find({
      business: businessId,
      status: { $in:["WAITING","CALLED","SERVING"] }
    })
      .populate("customer","name email")
      .populate("service","name averageDuration")
      .populate("department","name code")
      .populate({ path:"doctor", populate:{ path:"user", select:"name email" } })
      .sort({priority:-1,joinedAt:1});

    // Keep a small recent history for the hospital UI. Active queue remains
    // separate so completed visits do not get treated as live patients.
    const recentHistory = await Queue.find({
      business: businessId,
      status: { $in:["COMPLETED","SKIPPED","CANCELLED","NO_SHOW"] }
    })
      .populate("customer","name email")
      .populate("service","name averageDuration")
      .populate("department","name code")
      .populate({ path:"doctor", populate:{ path:"user", select:"name email" } })
      .sort({completedAt:-1,updatedAt:-1})
      .limit(20);

    res.json({success:true,count:queue.length,queue,recentHistory});
  } catch(e){next(e);}
};
const cancelQueue = async (req,res,next) => {
  try { const queue=await Queue.findOne({_id:req.params.id,customer:req.user._id,status:{ $in:["WAITING","CALLED"] }}); if(!queue)return res.status(404).json({success:false,message:"Active queue entry not found"}); queue.status="CANCELLED"; await queue.save(); await emitQueueUpdate(req.app.get("io"), queue.business, queue.service, "CANCELLED", { doctorId: queue.doctor, departmentId: queue.department }); res.json({success:true,message:"Queue entry cancelled successfully",queue}); } catch(e){next(e);} };
module.exports={joinQueue,getMyQueue,getBusinessQueue,cancelQueue};
