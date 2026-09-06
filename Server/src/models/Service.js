const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
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

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    averageDuration: {
      type: Number,
      required: true,
      min: 1,
      default: 15,
    },

    bufferTime: {
      type: Number,
      min: 0,
      default: 5,
    },

    price: {
      type: Number,
      min: 0,
      default: 0,
    },

    maxDailyCapacity: {
      type: Number,
      min: 1,
      default: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ business: 1, name: 1 });

module.exports = mongoose.model("Service", serviceSchema);