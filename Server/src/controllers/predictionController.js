const Queue = require("../models/Queue");
const Department = require("../models/Department");
const Service = require("../models/Service");
const { calculateWaitPrediction } = require("../services/predictionService");

const getQueuePrediction = async (req, res) => {
  try {
    const { businessId, serviceId, departmentId, queueId } = req.query;
    let resolvedServiceId = serviceId;
    if (!resolvedServiceId && departmentId) {
      const department = await Department.findOne({ _id: departmentId, hospital: businessId, isActive: true });
      resolvedServiceId = department?.legacyService;
    }

    if (!businessId || !resolvedServiceId) {
      return res.status(400).json({
        success: false,
        message: "businessId and departmentId are required",
      });
    }

    if (queueId) {
      const queueEntry = await Queue.findById(queueId);

      if (!queueEntry) {
        return res.status(404).json({
          success: false,
          message: "Queue entry not found",
        });
      }

      if (
        String(queueEntry.business) !== String(businessId) ||
        String(queueEntry.service) !== String(resolvedServiceId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Queue entry does not belong to this hospital/department",
        });
      }
    }

    const prediction = await calculateWaitPrediction({
      businessId,
      serviceId: resolvedServiceId,
      targetQueueId: queueId || null,
    });

    return res.status(200).json({
      success: true,
      prediction,
    });
  } catch (error) {
    console.error("Queue prediction error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate queue prediction",
    });
  }
};

module.exports = {
  getQueuePrediction,
};
