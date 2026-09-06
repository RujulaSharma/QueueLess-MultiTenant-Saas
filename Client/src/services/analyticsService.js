const Queue = require("../models/Queue");
const ServiceHistory = require("../models/ServiceHistory");

const buildServiceAnalytics = async ({ businessId, serviceId, days = 30 }) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [history, queueStats] = await Promise.all([
    ServiceHistory.find({
      business: businessId,
      service: serviceId,
      completedAt: { $gte: since },
    }).sort({ completedAt: -1 }),
    Queue.aggregate([
      {
        $match: {
          business: businessId,
          service: serviceId,
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
  ]);

  const durations = history
    .map((item) => Number(item.durationMinutes))
    .filter((value) => Number.isFinite(value) && value >= 0);

  const averageServiceMinutes =
    durations.length > 0
      ? Math.round(
          durations.reduce((sum, value) => sum + value, 0) / durations.length
        )
      : null;

  const sorted = [...durations].sort((a, b) => a - b);
  const medianServiceMinutes =
    sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null;

  const statusCounts = {};
  for (const item of queueStats) {
    statusCounts[item._id] = item.count;
  }

  const completed = statusCounts.COMPLETED || 0;
  const noShows = statusCounts.NO_SHOW || 0;
  const cancelled = statusCounts.CANCELLED || 0;
  const totalAppointments = completed + noShows + cancelled;

  const noShowRate =
    totalAppointments > 0
      ? Math.round((noShows / totalAppointments) * 100)
      : 0;

  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    completed: 0,
    averageDuration: null,
  }));

  for (const item of history) {
    hourly[item.hourOfDay].completed += 1;
  }

  for (const bucket of hourly) {
    const matching = history
      .filter((item) => item.hourOfDay === bucket.hour)
      .map((item) => item.durationMinutes);

    if (matching.length > 0) {
      bucket.averageDuration = Math.round(
        matching.reduce((sum, value) => sum + value, 0) / matching.length
      );
    }
  }

  const peakHour = hourly.reduce(
    (best, current) =>
      current.completed > best.completed ? current : best,
    hourly[0]
  );

  return {
    periodDays: days,
    samples: history.length,
    averageServiceMinutes,
    medianServiceMinutes,
    noShowRate,
    statusCounts,
    peakHour:
      peakHour.completed > 0
        ? { hour: peakHour.hour, completed: peakHour.completed }
        : null,
    hourly,
  };
};

const getHistoricalDuration = async ({
  businessId,
  serviceId,
  dayOfWeek,
  hourOfDay,
  fallback,
}) => {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const exactWindow = await ServiceHistory.find({
    business: businessId,
    service: serviceId,
    dayOfWeek,
    hourOfDay,
    completedAt: { $gte: since },
  }).select("durationMinutes");

  if (exactWindow.length >= 3) {
    return Math.round(
      exactWindow.reduce((sum, item) => sum + item.durationMinutes, 0) /
        exactWindow.length
    );
  }

  const recent = await ServiceHistory.find({
    business: businessId,
    service: serviceId,
    completedAt: { $gte: since },
  }).select("durationMinutes");

  if (recent.length > 0) {
    return Math.round(
      recent.reduce((sum, item) => sum + item.durationMinutes, 0) /
        recent.length
    );
  }

  return fallback;
};

module.exports = {
  buildServiceAnalytics,
  getHistoricalDuration,
};
