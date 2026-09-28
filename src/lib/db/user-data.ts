import "server-only";

import { withCurrentUserDb } from "@/lib/db/user-context";

/**
 * Every user-owned table, parents before children. Export reads them in this
 * order and deletion runs in reverse. Keep in sync with USER_TABLES in
 * tests/db/isolation.test.mjs, which fails when a table with `user_id` is
 * missing there (architecture §10: export and delete cover all data).
 */
export const USER_DATA_TABLES = ["user_settings"] as const;

export type UserDataExport = {
  format: "mylife-export";
  version: 1;
  exportedAt: string;
  tables: Record<(typeof USER_DATA_TABLES)[number], unknown[]>;
};

export async function exportUserData(): Promise<UserDataExport> {
  return withCurrentUserDb(async (client) => {
    const tables = {} as UserDataExport["tables"];
    for (const table of USER_DATA_TABLES) {
      // RLS limits every read to the current user; table names are constants.
      tables[table] = (await client.query(`SELECT * FROM ${table}`)).rows;
    }
    return {
      format: "mylife-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      tables,
    };
  });
}

/** Deletes all of the current user's data; the account and session remain. */
export async function deleteUserData(): Promise<void> {
  await withCurrentUserDb(async (client) => {
    for (const table of [...USER_DATA_TABLES].reverse()) {
      await client.query(`DELETE FROM ${table}`);
    }
  });
}
