import * as sqliteSchema from "./schema-sqlite";
import * as pgSchema from "./schema-pg";

const dbType = process.env.DB_TYPE || "sqlite";
const schema = dbType === "postgres" ? pgSchema : sqliteSchema;

export const accounts = schema.accounts;
export const holdings = schema.holdings;
export const assetClasses = schema.assetClasses;
export const settings = schema.settings;
export const exchangeRates = schema.exchangeRates;
export const snapshots = schema.snapshots;
export const transactions = schema.transactions;
export const users = schema.users;
export const authAccounts = schema.authAccounts;
export const sessions = schema.sessions;
export const verificationTokens = schema.verificationTokens;
