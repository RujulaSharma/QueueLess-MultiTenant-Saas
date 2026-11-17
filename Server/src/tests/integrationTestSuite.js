const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "../../.env") });

const User = require("../models/User");
const Business = require("../models/Business");
const Department = require("../models/Department");
const Service = require("../models/Service");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const Queue = require("../models/Queue");
const Project = require("../models/Project");
const Task = require("../models/Task");

async function runIntegrationTestSuite() {
  console.log("==================================================");
  console.log("QueueLess Multi-Tenant SaaS: Comprehensive Test Suite");
  console.log("==================================================\n");

  if (!process.env.MONGO_URI) {
    console.error("❌ No MONGO_URI provided in Server/.env. Test aborted.");
    process.exit(1);
  }

  try {
    console.log("1. Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("   ✔ MongoDB connection established successfully.\n");

    const timestamp = Date.now();

    // 2. Auth & User Testing
    console.log("2. Testing User Creation & Roles...");
    const adminEmail = `test_admin_${timestamp}@queueless.test`;
    const doctorEmail = `test_doctor_${timestamp}@queueless.test`;
    const patientEmail = `test_patient_${timestamp}@queueless.test`;

    const adminUser = await User.create({
      name: "Dr. Admin Chief",
      email: adminEmail,
      password: "TestPassword123!",
      role: "ADMIN",
    });
    console.log(`   ✔ Admin User created: ${adminUser.name} (${adminUser.email})`);

    const doctorUser = await User.create({
      name: "Dr. Anya Sharma",
      email: doctorEmail,
      password: "TestPassword123!",
      role: "DOCTOR",
    });
    console.log(`   ✔ Doctor User created: ${doctorUser.name} (${doctorUser.email})`);

    const patientUser = await User.create({
      name: "Rahul Verma",
      email: patientEmail,
      password: "TestPassword123!",
      role: "CUSTOMER",
    });
    console.log(`   ✔ Patient User created: ${patientUser.name} (${patientUser.email})\n`);

    // 3. Hospital Business Testing
    console.log("3. Testing Hospital Business Tenant Setup...");
    const hospital = await Business.create({
      name: `City Heart Hospital ${timestamp}`,
      owner: adminUser._id,
      category: "Hospital",
      address: "42 Wellness Boulevard, Medical District",
      phone: "+91 98765 43210",
      operatingHours: { open: "08:00", close: "20:00" },
    });
    console.log(`   ✔ Hospital Business registered: ${hospital.name} (ID: ${hospital._id})`);

    adminUser.businessId = hospital._id;
    await adminUser.save();

    doctorUser.businessId = hospital._id;
    await doctorUser.save();

    // 4. Department & Service Testing
    console.log("\n4. Testing Hospital Department & Service Setup...");
    const cardiology = await Department.create({
      hospital: hospital._id,
      name: "Cardiology",
      code: "CARD",
      consultationFee: 750,
      isActive: true,
    });
    console.log(`   ✔ Department created: ${cardiology.name} (Code: ${cardiology.code}, Fee: ₹${cardiology.consultationFee})`);

    const cardioConsult = await Service.create({
      business: hospital._id,
      department: cardiology._id,
      name: "Cardiology Consultation",
      price: 750,
      averageDuration: 20,
    });
    console.log(`   ✔ Clinical Service created: ${cardioConsult.name} (Duration: ${cardioConsult.averageDuration}m)`);

    // 5. Doctor Profile Testing
    console.log("\n5. Testing Doctor Profile & Linking...");
    const doctorProfile = await Doctor.create({
      user: doctorUser._id,
      hospital: hospital._id,
      department: cardiology._id,
      designation: "Senior Cardiologist",
      specialization: "Interventional Cardiology",
      status: "ACTIVE",
    });
    console.log(`   ✔ Doctor Profile linked: ${doctorProfile.designation} in ${cardiology.name}`);

    // 6. Appointment Booking Testing
    console.log("\n6. Testing Patient Appointment Booking...");
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1);

    const appointment = await Appointment.create({
      business: hospital._id,
      department: cardiology._id,
      service: cardioConsult._id,
      doctor: doctorProfile._id,
      customer: patientUser._id,
      appointmentDate: appointmentDate,
      scheduledTime: "10:30 AM",
      status: "CONFIRMED",
      notes: "Routine quarterly heart evaluation and BP monitoring",
    });
    console.log(`   ✔ Appointment booked: #${appointment._id} on ${appointment.scheduledTime} with status ${appointment.status}`);

    // 7. Queue System Testing
    console.log("\n7. Testing Real-time Queue Tracking...");
    const queueEntry = await Queue.create({
      business: hospital._id,
      department: cardiology._id,
      service: cardioConsult._id,
      doctor: doctorProfile._id,
      appointment: appointment._id,
      customer: patientUser._id,
      tokenNumber: 101,
      position: 1,
      status: "WAITING",
      estimatedWaitTime: 15,
      joinedAt: new Date(),
    });
    console.log(`   ✔ Queue entry generated: Token #${queueEntry.tokenNumber}, Position #${queueEntry.position}`);

    // Status transition: SERVING
    queueEntry.status = "SERVING";
    queueEntry.serviceStartedAt = new Date();
    await queueEntry.save();
    console.log(`   ✔ Queue state transitioned to: ${queueEntry.status}`);

    // Status transition: COMPLETED
    queueEntry.status = "COMPLETED";
    queueEntry.serviceCompletedAt = new Date();
    await queueEntry.save();
    console.log(`   ✔ Queue state transitioned to: ${queueEntry.status}`);

    // 8. ALG-WEB-01 Collaborative Workspace & Concurrency Testing
    console.log("\n8. Testing ALG-WEB-01 Collaborative Project Workspace...");
    const project = await Project.create({
      name: "Outpatient Queue Optimization Q4",
      description: "Cross-department team workspace for reducing patient wait times",
      priority: "HIGH",
      category: "Operations",
      owner: adminUser._id,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      members: [
        { user: adminUser._id, role: "OWNER" },
        { user: doctorUser._id, role: "MEMBER" },
      ],
    });
    console.log(`   ✔ Workspace Project created: "${project.name}" (Priority: ${project.priority})`);

    const task = await Task.create({
      projectId: project._id,
      title: "Deploy Automated Token Display Board",
      description: "Install electronic queue monitor in the Cardiology waiting lobby",
      priority: "HIGH",
      status: "TODO",
      assignedTo: doctorUser._id,
      createdBy: adminUser._id,
      version: 1,
    });
    console.log(`   ✔ Workspace Task created: "${task.title}" (Version: ${task.version})`);

    // Verify Optimistic Concurrency Control (Conflict detection)
    console.log("   --- Testing Simultaneous Update Conflict Detection ---");
    const staleVersion = 1;
    const conflictingTask = await Task.findOneAndUpdate(
      { _id: task._id, version: staleVersion },
      { $set: { status: "IN_PROGRESS" }, $inc: { version: 1 } },
      { returnDocument: "after" }
    );
    if (conflictingTask) {
      console.log(`   ✔ First update succeeded. Task version is now ${conflictingTask.version}.`);
    }

    // Second simultaneous edit with stale version 1 must fail (simulating 409 Conflict)
    const secondConflict = await Task.findOneAndUpdate(
      { _id: task._id, version: staleVersion },
      { $set: { status: "COMPLETED" }, $inc: { version: 1 } },
      { returnDocument: "after" }
    );

    if (secondConflict === null) {
      console.log("   ✔ Conflict successfully caught! Stale version was rejected (HTTP 409 Confirmed).");
    } else {
      throw new Error("Concurrency check failed: stale version update was unexpectedly accepted!");
    }

    // 9. Cleanup Test Data
    console.log("\n9. Cleaning up test data...");
    await Task.deleteMany({ projectId: project._id });
    await Project.deleteOne({ _id: project._id });
    await Queue.deleteOne({ _id: queueEntry._id });
    await Appointment.deleteOne({ _id: appointment._id });
    await Doctor.deleteOne({ _id: doctorProfile._id });
    await Service.deleteOne({ _id: cardioConsult._id });
    await Department.deleteOne({ _id: cardiology._id });
    await Business.deleteOne({ _id: hospital._id });
    await User.deleteMany({ _id: { $in: [adminUser._id, doctorUser._id, patientUser._id] } });
    console.log("   ✔ Cleaned up test records from database.");

    console.log("\n==================================================");
    console.log("🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (100% GREEN)");
    console.log("==================================================");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Integration test failed with error:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runIntegrationTestSuite();
