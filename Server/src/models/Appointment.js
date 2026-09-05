const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
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

    appointmentDate: {
      type: Date,
      required: true,
    },

    scheduledTime: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "SCHEDULED",
        "CONFIRMED",
        "CHECKED_IN",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ],
      default: "SCHEDULED",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    checkedInAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ business: 1, appointmentDate: 1 });
appointmentSchema.index({ customer: 1, appointmentDate: 1 });
appointmentSchema.index({ service: 1, appointmentDate: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
