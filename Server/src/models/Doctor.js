const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    designation: {
      type: String,
      trim: true,
      default: "Consultant",
      maxlength: 100,
    },
    specialization: {
      type: String,
      trim: true,
      default: "General Medicine",
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: "",
    },
    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ON_LEAVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

doctorSchema.index({ hospital: 1, status: 1 });

doctorSchema.index({ hospital: 1, department: 1 });

module.exports = mongoose.model("Doctor", doctorSchema);
