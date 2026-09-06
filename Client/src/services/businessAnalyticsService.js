const Queue = require("../models/Queue");
const ServiceHistory = require("../models/ServiceHistory");

const getBusinessAnalytics = async ({ businessId, days = 30 }) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [queueStats, history, serviceBreakdown, dailyVolume] = await Promise.all([
    Queue.aggregate([
      {
        $match: {
          business: businessId,
          joinedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    ServiceHistory.find({
      business: businessId,
      completedAt: { $gte: since },
    }).populate("service", "name"),
    Queue.aggregate([
      {
        $match: {
          business: businessId,
          joinedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: "$service",
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
          noShows: {
            $sum: { $cond: [{ $eq: ["$status", "NO_SHOW"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          serviceId: "$_id",
          serviceName: { $ifNull: ["$service.name", "Unknown Service"] },
          total: 1,
          completed: 1,
          noShows: 1,
          cancelled: 1,
        },
      },
      { $sort: { total: -1 } },
    ]),
    Queue.aggregate([
      {
        $match: {
          business: businessId,
          joinedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$joinedAt" },
            month: { $month: "$joinedAt" },
            day: { $dayOfMonth: "$joinedAt" },
          },
          customers: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]),
  ]);

  const statusCounts = {};
  for (const item of queueStats) {
    statusCounts[item._id] = item.count;
  }

  const completed = statusCounts.COMPLETED || 0;
  const noShows = statusCounts.NO_SHOW || 0;
  const cancelled = statusCounts.CANCELLED || 0;
  const total = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

  const durations = history
    .map((item) => Number(item.durationMinutes))
    .filter((value) => Number.isFinite(value));

  const averageServiceMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null;

  const noShowRate =
    total > 0 ? Math.round((noShows / total) * 100) : 0;

  const waitDurations = await Queue.aggregate([
    {
      $match: {
        business: businessId,
        joinedAt: { $gte: since },
        status: "COMPLETED",
        calledAt: { $ne: null },
      },
    },
    {
      $project: {
        waitMinutes: {
          $divide: [
            { $subtract: ["$calledAt", "$joinedAt"] },
            60000,
          ],
        },
      },
    },
  ]);

  const waits = waitDurations
    .map((item) => item.waitMinutes)
    .filter((value) => Number.isFinite(value) && value >= 0);

  const averageWaitMinutes =
    waits.length > 0
      ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length)
      : null;

  const servicePerformance = serviceBreakdown.map((item) => {
    const serviceHistory = history.filter(
      (record) =>
        record.service &&
        String(record.service._id) === String(item.serviceId)
    );

    const serviceDurations = serviceHistory
      .map((record) => Number(record.durationMinutes))
      .filter((value) => Number.isFinite(value));

    return {
      ...item,
      averageServiceMinutes:
        serviceDurations.length > 0
          ? Math.round(
              serviceDurations.reduce((sum, value) => sum + value, 0) /
                serviceDurations.length
            )
          : null,
    };
  });

  return {
    periodDays: days,
    totalCustomers: total,
    completed,
    noShows,
    cancelled,
    averageWaitMinutes,
    averageServiceMinutes,
    noShowRate,
    servicePerformance,
    dailyVolume: dailyVolume.map((item) => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(
        item._id.day
      ).padStart(2, "0")}`,
      customers: item.customers,
      completed: item.completed,
    })),
  };
};

module.exports = { getBusinessAnalytics };
