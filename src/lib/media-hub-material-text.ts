// PostgreSQL text/JSON cannot contain NUL. Retain original binary assets unchanged.
export function sanitizeMaterialStorageText<T>(value: T): T {
  if (typeof value === "string") return value.replace(/\u0000/g, " ") as T;
  if (Buffer.isBuffer(value) || value instanceof Date || value === null) return value;
  if (Array.isArray(value)) return value.map(sanitizeMaterialStorageText) as T;
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key.replace(/\u0000/g, " "), sanitizeMaterialStorageText(entry),
    ])) as T;
  }
  return value;
}
