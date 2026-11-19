import { CATEGORIES, SERVICE_MODES } from "./constants.js";

// Whitelists the fields, so a client can never send approvalStatus,
// technicianEmail, createdAt, etc. through the body.
export function validateService(body = {}) {
  const errors = [];
  const str = (v) => (typeof v === "string" ? v.trim() : "");

  const data = {
    title: str(body.title),
    category: str(body.category),
    description: str(body.description),
    image: str(body.image),
    basePrice: Number(body.basePrice),
    estimatedDuration: str(body.estimatedDuration),
    serviceMode: str(body.serviceMode),
    serviceArea: str(body.serviceArea),
  };

  if (data.title.length < 3) errors.push("Title must be at least 3 characters");
  if (!CATEGORIES.includes(data.category)) errors.push("Invalid category");
  if (data.description.length < 20) errors.push("Description must be at least 20 characters");
  if (!/^https?:\/\//.test(data.image)) errors.push("A valid service image is required");
  if (!Number.isFinite(data.basePrice) || data.basePrice <= 0)
    errors.push("Base price must be a positive number");
  if (!data.estimatedDuration) errors.push("Estimated duration is required");
  if (!SERVICE_MODES.includes(data.serviceMode)) errors.push("Invalid service mode");
  if (!data.serviceArea) errors.push("Service area is required");

  return { errors, data };
}