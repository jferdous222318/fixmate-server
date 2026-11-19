import { ObjectId } from "mongodb";
import { col } from "../config/db.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { CATEGORIES, SERVICE_MODES } from "../utils/constants.js";

const SORTS = {
  newest: { createdAt: -1 },
  "price-asc": { basePrice: 1, createdAt: -1 },
  "price-desc": { basePrice: -1, createdAt: -1 },
};

// GET /api/services?search=&category=&mode=&sort=&page=&limit=
export const getPublicServices = async (req, res, next) => {
  try {
    const { search, category, mode, sort = "newest" } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    // public pages only ever see approved + available services
    const filter = { approvalStatus: "approved", isAvailable: true };

    if (category && CATEGORIES.includes(category)) filter.category = category;
    if (mode && SERVICE_MODES.includes(mode)) filter.serviceMode = mode;

    if (search?.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ title: regex }, { category: regex }];
    }

    const services = await col("services");
    const [items, total] = await Promise.all([
      services
        .find(filter)
        .sort(SORTS[sort] || SORTS.newest)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      services.countDocuments(filter),
    ]);

    res.json({ services: items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/services/:id
export const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(404).json({ message: "Service not found" });

    const services = await col("services");
    const service = await services.findOne({
      _id: new ObjectId(id),
      approvalStatus: "approved",
      isAvailable: true,
    });
    if (!service) return res.status(404).json({ message: "Service not found" });

    // technician summary for the details page
    const users = await col("user");
    const tech = await users.findOne(
      { email: service.technicianEmail },
      { projection: { name: 1, image: 1, area: 1, bio: 1 } }
    );

    res.json({ ...service, technician: tech || null });
  } catch (err) {
    next(err);
  }
};