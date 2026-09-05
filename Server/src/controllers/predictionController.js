const Queue = require("../models/Queue");
const { calculateWaitPrediction } = require("../services/predictionService");

const getQueuePrediction = async (req, res) => {
  try {
    const { businessId, serviceId, queueId } = req.query;

    if (!businessId || !serviceId) {
      return res.status(400).json({
        success: false,
        message: "businessId and serviceId are required",
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
        String(queueEntry.service) !== String(serviceId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Queue entry does not belong to this business/service",
        });
      }
    }

    const prediction = await calculateWaitPrediction({
      businessId,
      serviceId,
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
