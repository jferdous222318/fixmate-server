import { getDb } from "../config/db.js";

const db = await getDb();
const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 3600 * 1000);
const daysAgo = (d) => hoursAgo(d * 24);

// 1) USERS: updates the account if it already exists (signed up on the client), else creates it
const people = [
  { email: "admin@fixmate.com", name: "FixMate Admin", role: "admin", area: "Gulshan, Dhaka", phone: "01700000000", bio: "Platform administrator." },
  { email: "tech1@fixmate.com", name: "Rahim Uddin", role: "technician", area: "Mirpur, Dhaka", phone: "01711111111", bio: "10 years fixing smartphones, laptops and TVs. Genuine parts and honest pricing." },
  { email: "tech2@fixmate.com", name: "Nusrat Jahan", role: "technician", area: "Dhanmondi, Dhaka", phone: "01722222222", bio: "Certified appliance technician for AC, fridge and washing machines." },
  { email: "customer1@fixmate.com", name: "Tanvir Hasan", role: "customer", area: "Uttara, Dhaka", phone: "01733333333", bio: "" },
  { email: "customer2@fixmate.com", name: "Maliha Rahman", role: "customer", area: "Banani, Dhaka", phone: "01744444444", bio: "" },
];
const users = db.collection("user");
for (const p of people) {
  await users.updateOne(
    { email: p.email },
    {
      $set: { role: p.role, area: p.area, phone: p.phone, bio: p.bio },
      $setOnInsert: { name: p.name, emailVerified: true, createdAt: new Date() },
    },
    { upsert: true }
  );
}
const T = { 1: people[1], 2: people[2] };
const C = { 1: people[3], 2: people[4] };

// 2) SERVICES (placeholder images, replace later with ImgBB uploads)
const img = (t) => `https://placehold.co/800x500/0F5C55/F6F2EA/png?text=${encodeURIComponent(t)}`;
const svc = (title, category, basePrice, estimatedDuration, serviceMode, tech, description, extra = {}) => ({
  title, category, basePrice, estimatedDuration, serviceMode, description,
  image: img(title),
  serviceArea: tech.area,
  technicianName: tech.name,
  technicianEmail: tech.email,
  approvalStatus: "approved",
  isAvailable: true,
  ...extra,
});

const serviceList = [
  svc("iPhone Screen Replacement", "Smartphone", 60, "2-3 hours", "Shop Drop-off", T[1], "Original quality display replacement for all iPhone models with a 3 month warranty."),
  svc("Android Battery Replacement", "Smartphone", 25, "1 hour", "Shop Drop-off", T[1], "New high capacity battery installed while you wait, with a 6 month warranty."),
  svc("Laptop Servicing & Cleaning", "Laptop & PC", 35, "3-4 hours", "Home Visit", T[1], "Internal dust cleaning, thermal paste renewal and a full performance checkup."),
  svc("Laptop Screen Repair", "Laptop & PC", 80, "1 day", "Shop Drop-off", T[1], "Cracked or flickering laptop screens replaced with tested panels."),
  svc("AC Gas Refill & Servicing", "AC", 45, "2 hours", "Home Visit", T[2], "Complete split AC servicing with gas pressure check and indoor and outdoor cleaning."),
  svc("AC Installation", "AC", 70, "4 hours", "Home Visit", T[2], "Professional installation of split ACs with piping, stand and test run."),
  svc("Refrigerator Compressor Repair", "Refrigerator", 90, "1 day", "Home Visit", T[2], "Diagnosis and repair of cooling problems, compressor and thermostat faults."),
  svc("Refrigerator Not Cooling Fix", "Refrigerator", 40, "2-3 hours", "Home Visit", T[2], "Fast fix for fridges that stopped cooling, including gas leak detection."),
  svc("LED TV Panel & Backlight Repair", "TV", 55, "1-2 days", "Shop Drop-off", T[1], "Backlight strip replacement and display fault repair for LED and LCD TVs."),
  svc("Smart TV Software Fix", "TV", 20, "1 hour", "Home Visit", T[1], "Boot loops, app crashes and Wi-Fi issues on smart TVs solved at home."),
  svc("Washing Machine Drum Repair", "Washing Machine", 65, "3 hours", "Home Visit", T[2], "Drum bearing, belt and motor repair for front and top load washing machines."),
  svc("Washing Machine Drain Fix", "Washing Machine", 30, "1-2 hours", "Home Visit", T[2], "Blocked drain, pump and water inlet problems fixed on the spot."),
  svc("House Electrical Wiring Check", "Electrical", 30, "2 hours", "Home Visit", T[1], "Safety inspection of wiring, switches and the distribution board with a short report."),
  svc("Ceiling Fan & Switch Repair", "Electrical", 15, "1 hour", "Home Visit", T[2], "Fan, regulator and switch repair or replacement by a licensed electrician."),
  // two pending ones so the admin approval page has something to show
  svc("Gaming PC Repair & Upgrade", "Laptop & PC", 50, "1 day", "Shop Drop-off", T[1], "Hardware diagnosis, RAM and SSD upgrades and GPU cleaning for gaming PCs.", { approvalStatus: "pending" }),
  svc("Inverter AC Deep Cleaning", "AC", 55, "3 hours", "Home Visit", T[2], "Deep chemical wash for inverter ACs to restore cooling and cut power use.", { approvalStatus: "pending" }),
].map((s, i, arr) => ({ ...s, createdAt: daysAgo(arr.length - i) })); // later items are newer

const services = db.collection("services");
const bookings = db.collection("bookings");
const payments = db.collection("payments");

// WARNING: clears these 3 collections. Never run this against live data you want to keep.
await Promise.all([services.deleteMany({}), bookings.deleteMany({}), payments.deleteMany({})]);
const inserted = await services.insertMany(serviceList);
const ids = inserted.insertedIds; // { 0: ObjectId, 1: ObjectId, ... }

// 3) BOOKINGS in every status
const PATH = {
  requested: ["requested"],
  accepted: ["requested", "accepted"],
  "in-progress": ["requested", "accepted", "in-progress"],
  completed: ["requested", "accepted", "in-progress", "completed"],
  rejected: ["requested", "rejected"],
  cancelled: ["requested", "cancelled"],
};

const plan = [
  { s: 0, c: 1, status: "requested" },
  { s: 1, c: 1, status: "accepted" },
  { s: 2, c: 1, status: "in-progress" },
  { s: 3, c: 1, status: "completed", final: 85 },              // unpaid -> Pay Now button
  { s: 4, c: 1, status: "completed", final: 50, paid: true },
  { s: 0, c: 2, status: "cancelled" },
  { s: 5, c: 2, status: "rejected" },
  { s: 6, c: 2, status: "completed", final: 95, paid: true },
  { s: 7, c: 2, status: "in-progress" },
  { s: 8, c: 2, status: "requested" },
];

const bookingDocs = plan.map((p, i) => {
  const service = serviceList[p.s];
  const customer = C[p.c];
  const start = daysAgo(10 - i);
  const history = PATH[p.status].map((status, k) => ({
    status,
    changedAt: new Date(start.getTime() + k * 3 * 3600 * 1000),
  }));
  return {
    serviceId: String(ids[p.s]),
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,
    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    address: `House ${10 + i}, Road ${i + 2}, ${customer.area}`,
    preferredDate: new Date(start.getTime() + 2 * 86400000),
    problemDescription: `The ${service.category.toLowerCase()} has a problem and needs a proper repair as soon as possible.`,
    status: p.status,
    finalAmount: p.final ?? service.basePrice,
    paymentStatus: p.paid ? "paid" : "unpaid",
    statusHistory: history,
    createdAt: start,
    ...(p.paid ? { paidAt: new Date(start.getTime() + 6 * 3600 * 1000) } : {}),
  };
});
const bookingResult = await bookings.insertMany(bookingDocs);

// 4) PAYMENTS for the paid bookings
const paymentDocs = bookingDocs
  .map((b, i) => ({ b, id: bookingResult.insertedIds[i] }))
  .filter(({ b }) => b.paymentStatus === "paid")
  .map(({ b, id }, n) => ({
    bookingId: String(id),
    serviceTitle: b.serviceTitle,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    technicianName: b.technicianName,
    technicianEmail: b.technicianEmail,
    amount: b.finalAmount,
    currency: "usd",
    transactionId: `pi_seed_${n + 1}`,
    stripeSessionId: `cs_test_seed_${n + 1}`,
    paymentStatus: "paid",
    paidAt: b.paidAt,
  }));
await payments.insertMany(paymentDocs);

console.log(`Seeded: ${serviceList.length} services, ${bookingDocs.length} bookings, ${paymentDocs.length} payments, ${people.length} users`);
process.exit(0);