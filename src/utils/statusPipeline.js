// current status -> next status -> who may make the change
export const TRANSITIONS = {
  requested: { accepted: "technician", rejected: "technician", cancelled: "customer" },
  accepted: { "in-progress": "technician" },
  "in-progress": { completed: "technician" },
};

export const canTransition = (from, to, actor) =>
  TRANSITIONS[from]?.[to] === actor;