const assert = require("node:assert/strict");
const { once } = require("node:events");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { io } = require("../../../Client/node_modules/socket.io-client");
const User = require("../models/User");
const Business = require("../models/Business");
const Department = require("../models/Department");
const Service = require("../models/Service");
const Doctor = require("../models/Doctor");
const { calendarDate } = require("../services/appointmentSlots");

const database = `queueless_api_test_${process.pid}`;
const secret = "queueless-local-api-test-secret";
const sockets = new Set();
let server;
let baseURL;

function token(user) {
  return jwt.sign({ userId: user._id }, secret, { expiresIn: "5m" });
}

async function request(path, user, { method = "GET", body, status = 200 } = {}) {
  const response = await fetch(`${baseURL}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Authorization: `Bearer ${token(user)}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, status, `${method} ${path}`);
  return response.json();
}

function connect(user) {
  const socket = io(baseURL, {
    auth: user ? { token: token(user) } : {},
    reconnection: false,
    timeout: 5000,
  });
  sockets.add(socket);
  return socket;
}

async function run() {
  if (!process.env.MONGO_URI) throw new Error("Set MONGO_URI to an isolated MongoDB instance.");
  await mongoose.connect(process.env.MONGO_URI, { dbName: database, serverSelectionTimeoutMS: 5000 });
  const newUser = (role) => User.create({
    name: `Test ${role}`, email: `${role.toLowerCase()}@example.test`, password: "unused-fixture-password", role,
  });
  const [admin, patient, clinician, outsider] = await Promise.all(
    ["ADMIN", "CUSTOMER", "DOCTOR", "STAFF"].map(newUser)
  );
  const hospital = await Business.create({ owner: admin._id, name: "Test Hospital", category: "Hospital", address: "Test address", phone: "1234567890" });
  admin.businessId = hospital._id;
  clinician.businessId = hospital._id;
  outsider.businessId = new mongoose.Types.ObjectId();
  await Promise.all([admin.save(), clinician.save(), outsider.save()]);
  const department = await Department.create({ hospital: hospital._id, name: "General Medicine", code: "GEN" });
  const service = await Service.create({ business: hospital._id, department: department._id, name: "Consultation", averageDuration: 15, price: 0 });
  department.legacyService = service._id;
  await department.save();
  const doctor = await Doctor.create({ user: clinician._id, department: department._id, hospital: hospital._id, specialization: "General Medicine" });

  server = spawn(process.execPath, ["src/server.js"], {
    cwd: require("node:path").join(__dirname, "../.."),
    env: { ...process.env, PORT: "0", MONGO_DB_NAME: database, JWT_SECRET: secret },
    stdio: ["ignore", "pipe", "inherit"],
  });
  baseURL = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("API startup timed out")), 15000);
    server.stdout.on("data", (data) => {
      const url = String(data).match(/http:\/\/localhost:\d+(?=\/api\/health)/)?.[0];
      if (url) { clearTimeout(timer); resolve(url); }
    });
    server.once("exit", (code) => { clearTimeout(timer); reject(new Error(`API exited with code ${code}`)); });
  });

  await request("/appointments/my", null, { status: 401 });
  const credentials = { name: "Test Registration", email: "registration@example.test", password: "example-test-password" };
  const registered = await request("/auth/register", null, { method: "POST", body: credentials, status: 201 });
  assert.equal(registered.user.role, "CUSTOMER");
  const loggedIn = await request("/auth/login", null, { method: "POST", body: credentials });
  assert.equal(loggedIn.user.id, registered.user.id);
  await request("/auth/login", null, { method: "POST", body: { ...credentials, password: "incorrect" }, status: 401 });
  await request("/admin/business", patient, { status: 403 });
  const secondAdmin = await User.create({
    name: "Second Hospital Admin", email: "second-admin@example.test", password: "unused-fixture-password", role: "ADMIN",
  });
  const secondHospital = await request("/admin/business", secondAdmin, {
    method: "POST", body: { name: "Second Test Hospital", category: "Hospital" }, status: 201,
  });
  const createdDepartment = await request("/admin/departments", secondAdmin, {
    method: "POST", body: { name: "Diagnostics", code: "DX" }, status: 201,
  });
  const doctorCredentials = { name: "Second Doctor", email: "second-doctor@example.test", password: "second-doctor-test-password" };
  await request("/admin/doctors", secondAdmin, {
    method: "POST", body: { ...doctorCredentials, departmentId: String(department._id) }, status: 404,
  });
  const createdDoctor = await request("/admin/doctors", secondAdmin, {
    method: "POST", body: { ...doctorCredentials, departmentId: createdDepartment.department._id }, status: 201,
  });
  assert.equal(createdDoctor.doctor.hospital._id || createdDoctor.doctor.hospital, secondHospital.business._id);
  const anonymous = connect();
  const [authError] = await once(anonymous, "connect_error");
  assert.equal(authError.message, "Authentication required");
  const crossTenant = connect(outsider);
  await once(crossTenant, "connect");
  assert.equal(await crossTenant.timeout(3000).emitWithAck("joinBusinessRoom", String(hospital._id)), false);
  await request(`/queue/business/${hospital._id}`, outsider, { status: 403 });

  await request("/analytics/service?businessId=" + hospital._id + "&serviceId=" + service._id, outsider, { status: 403 });
  const livePatient = connect(patient);
  await once(livePatient, "connect");
  assert.equal(await livePatient.timeout(3000).emitWithAck("joinBusinessRoom", String(hospital._id)), false);

  const liveAdmin = connect(admin);
  await once(liveAdmin, "connect");
  assert.equal(await liveAdmin.timeout(3000).emitWithAck("joinBusinessRoom", String(hospital._id)), true);
  const date = calendarDate().toISOString().slice(0, 10);
  const availability = `/doctors/availability?doctorId=${doctor._id}&date=${date}`;
  assert.ok((await request(availability, patient)).availableTimes.includes("10:30"));
  const bookedEvent = once(liveAdmin, "appointment:created", { signal: AbortSignal.timeout(5000) });
  const body = { businessId: String(hospital._id), doctorId: String(doctor._id), departmentId: String(department._id), appointmentDate: date, scheduledTime: "10:30", notes: "Synthetic test note" };
  const book = () => fetch(baseURL + "/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token(patient) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const bookings = await Promise.all([book(), book()]);
  assert.deepEqual(bookings.map((response) => response.status).sort(), [201, 409]);
  const { appointment } = await bookings.find((response) => response.status === 201).json();
  assert.deepEqual((await bookedEvent)[0], { businessId: String(hospital._id) });
  await request("/appointments", patient, { method: "POST", body, status: 409 });
  assert.ok(!(await request(availability, patient)).availableTimes.includes("10:30"));
  await request(`/appointments/${appointment._id}`, outsider, { status: 403 });

  const checkIn = () => request(`/appointments/${appointment._id}/check-in`, patient, { method: "PATCH" });
  const [first, second] = await Promise.all([checkIn(), checkIn()]);
  assert.equal(first.queueEntry._id, second.queueEntry._id);
  const queueId = first.queueEntry._id;
  assert.equal(await livePatient.timeout(3000).emitWithAck("joinBusinessRoom", String(hospital._id)), true);
  const prediction = await request(`/predictions/wait-time?businessId=${hospital._id}&departmentId=${department._id}&queueId=${queueId}`, patient);
  assert.equal(prediction.prediction.estimatedWaitMinutes, 0);
  const queueEvent = once(livePatient, "queue:updated", { signal: AbortSignal.timeout(5000) });
  await request("/doctor/dashboard/queue/next", clinician, { method: "POST" });
  assert.deepEqual((await queueEvent)[0], { businessId: String(hospital._id) });
  await request(`/doctor/dashboard/queue/${queueId}/start`, clinician, { method: "PATCH" });
  await request(`/doctor/dashboard/queue/${queueId}/complete`, clinician, { method: "PATCH" });
  assert.equal((await request(`/appointments/${appointment._id}`, patient)).appointment.status, "COMPLETED");
  assert.equal((await request("/appointments/my", patient)).appointments.length, 1);
  assert.equal((await request("/business/dashboard", admin)).dashboard.appointmentCounts.completed, 1);
  console.log("API workflow passed: booking, availability, duplicate slots, tenant isolation, Socket.IO, check-in, prediction, and consultation.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  for (const socket of sockets) socket.close();
  if (server && server.exitCode === null) server.kill();
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
