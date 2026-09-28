import "server-only";

import { withCurrentUserDb } from "@/lib/db/user-context";
import type {
  ChosenAction,
  DecisionReason,
  RecommendedAction,
} from "@/lib/decision/decision";
import type { PlannedSession } from "@/lib/decision/sessions";
import type { LightState } from "@/lib/light/light";

export type JournalDay = {
  date: string;
  verdict: LightState;
  reason: DecisionReason;
  ruleVersion: string;
  plannedSession: PlannedSession;
  recommendedAction: RecommendedAction;
  chosenAction: ChosenAction | null;
  customText: string | null;
  hrCap: number;
};

/** The latest decided days, newest first (02.13). */
export function getJournal(limit = 60): Promise<JournalDay[]> {
  return withCurrentUserDb(async (client) => {
    const { rows } = await client.query<JournalDay>(
      `SELECT local_date::text AS "date",
              snapshot->'light'->>'verdict' AS verdict,
              snapshot->>'reason' AS reason,
              rule_version AS "ruleVersion",
              planned_session AS "plannedSession",
              recommended_action AS "recommendedAction",
              chosen_action AS "chosenAction",
              custom_text AS "customText",
              (snapshot->>'hrCap')::int AS "hrCap"
         FROM day_decisions
        ORDER BY local_date DESC
        LIMIT $1`,
      [limit],
    );
    return rows;
  });
}
