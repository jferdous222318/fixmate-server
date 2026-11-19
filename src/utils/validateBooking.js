// Whitelists the request-form fields. Name, email and service data are
// never taken from the body: the server copies them itself.
export function validateBooking(body = {}) {
  const errors = [];
  const str = (v) => (typeof v === "string" ? v.trim() : "");

  const data = {
    serviceId: str(body.serviceId),
    customerPhone: str(body.customerPhone),
    address: str(body.address),
    problemDescription: str(body.problemDescription),
  };

  if (!/^[+\d][\d\s-]{6,19}$/.test(data.customerPhone)) errors.push("Enter a valid phone number");
  if (data.address.length < 5) errors.push("Address must be at least 5 characters");
  if (data.problemDescription.length < 20)
    errors.push("Problem description must be at least 20 characters");

  // preferredDate: today or a future date ("YYYY-MM-DD" from the date input)
  const date = new Date(body.preferredDate);
  if (!body.preferredDate || Number.isNaN(date.getTime())) {
    errors.push("Preferred date is required");
  } else {
    // one day of tolerance so users in other time zones are not rejected for "today"
    const min = new Date();
    min.setUTCHours(0, 0, 0, 0);
    min.setUTCDate(min.getUTCDate() - 1);
    if (date < min) errors.push("Preferred date must be today or a future date");
  }
  data.preferredDate = date;

  return { errors, data };
}