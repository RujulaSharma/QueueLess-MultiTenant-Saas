const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
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

    category: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    openingHours: {
      monday: { type: String, default: "09:00-18:00" },
      tuesday: { type: String, default: "09:00-18:00" },
      wednesday: { type: String, default: "09:00-18:00" },
      thursday: { type: String, default: "09:00-18:00" },
      friday: { type: String, default: "09:00-18:00" },
      saturday: { type: String, default: "09:00-18:00" },
      sunday: { type: String, default: "Closed" },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Business", businessSchema);