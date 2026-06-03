export const APP_ROLES = [
  "READER",
  "AUTHOR",
  "PUBLISHER_ADMIN",
  "EDITOR",
  "BOOKSTORE_PARTNER",
  "LIBRARY_BUYER",
  "RIGHTS_BUYER",
  "ADMIN",
  "SUPER_ADMIN"
] as const;

export type AppRole = (typeof APP_ROLES)[number];
