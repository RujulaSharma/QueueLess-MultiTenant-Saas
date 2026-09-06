const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
      index: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tokenNumber: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "WAITING",
        "CALLED",
        "SERVING",
        "COMPLETED",
        "SKIPPED",
        "CANCELLED",
        "NO_SHOW",
      ],
      default: "WAITING",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    calledAt: {
      type: Date,
      default: null,
    },

    serviceStartedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    estimatedWaitTime: {
      type: Number,
      default: 0,
      min: 0,
    },

    position: {
      type: Number,
      default: 0,
      min: 0,
    },

    priority: {
      type: String,
      enum: ["NORMAL", "HIGH"],
      default: "NORMAL",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

queueSchema.index({ business: 1, service: 1, status: 1 });
queueSchema.index({ business: 1, tokenNumber: 1 });
queueSchema.index({ customer: 1, status: 1 });

module.exports = mongoose.model("Queue", queueSchema);