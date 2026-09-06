const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    averageDuration: {
      type: Number,
      min: 1,
      default: 15,
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    ownerDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },
    legacyService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

departmentSchema.index({ hospital: 1, code: 1 }, { unique: true });
departmentSchema.index({ hospital: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Department", departmentSchema);
