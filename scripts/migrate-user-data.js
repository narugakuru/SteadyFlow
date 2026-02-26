/* eslint-disable no-console */
const bcrypt = require("bcrypt");
const { eq, isNull } = require("drizzle-orm");
const { db } = require("../src/db");
const { users, accounts, assetClasses, snapshots, settings } = require("../src/db/schema");

async function ensureAdminUser(email, password) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    const user = existing[0];
    if (user.role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
    }
    return user;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    email,
    password: hashedPassword,
    role: "admin",
    plan: "free",
  });

  const [createdUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!createdUser) {
    throw new Error("Failed to create admin user.");
  }
  return createdUser;
}

async function migrateUserData() {
  const email = (process.env.DEFAULT_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "";

  if (!email || !password) {
    throw new Error("DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be set.");
  }

  const adminUser = await ensureAdminUser(email, password);

  await db.update(accounts).set({ userId: adminUser.id }).where(isNull(accounts.userId));
  await db.update(assetClasses).set({ userId: adminUser.id }).where(isNull(assetClasses.userId));
  await db.update(snapshots).set({ userId: adminUser.id }).where(isNull(snapshots.userId));
  await db.update(settings).set({ userId: adminUser.id }).where(isNull(settings.userId));

  console.log("User data migration complete. Default admin:", adminUser.email);
}

migrateUserData().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
