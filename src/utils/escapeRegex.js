// stops users from sending regex characters in the search box
export const escapeRegex = (text = "") =>
    text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");