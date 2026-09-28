import { exportUserData } from "@/lib/db/user-data";

/**
 * Downloads everything the user owns as one JSON file (architecture §10).
 * GET is safe here: it only reads, and the session cookie is SameSite=Lax.
 */
export async function GET() {
  const data = await exportUserData();
  const day = data.exportedAt.slice(0, 10);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="way-of-life-export-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
