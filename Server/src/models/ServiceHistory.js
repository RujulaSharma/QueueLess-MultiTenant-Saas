const mongoose = require("mongoose");

const serviceHistorySchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    queueEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
      default: null,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 0,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    hourOfDay: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
  },
  { timestamps: true }
);

serviceHistorySchema.index({ business: 1, service: 1, completedAt: -1 });
serviceHistorySchema.index({ service: 1, dayOfWeek: 1, hourOfDay: 1 });

module.exports = mongoose.model("ServiceHistory", serviceHistorySchema);
