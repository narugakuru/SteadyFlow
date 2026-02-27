import * as sqliteSchema from "./schema-sqlite";
import * as pgSchema from "./schema-pg";

const dbType = process.env.DB_TYPE || "sqlite";
const schema = dbType === "postgres" ? pgSchema : sqliteSchema;

/* eslint-disable @typescript-eslint/no-explicit-any */
// Runtime only uses one schema; cast to `any` to avoid SQLite|PG union type errors
export const accounts = schema.accounts as any;
export const holdings = schema.holdings as any;
export const assetClasses = schema.assetClasses as any;
export const settings = schema.settings as any;
export const exchangeRates = schema.exchangeRates as any;
export const netvalue = schema.netvalue as any;
export const transactions = schema.transactions as any;
export const users = schema.users as any;
export const authAccounts = schema.authAccounts as any;
export const sessions = schema.sessions as any;
export const verificationTokens = schema.verificationTokens as any;
