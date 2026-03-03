import { recordTodayNetvalue } from "@/lib/netvalue-service";

export async function runMutationWithNetvalue<T>(
  userId: string,
  action: () => Promise<T>
): Promise<T> {
  const result = await action();
  if (result instanceof Response && !result.ok) {
    return result;
  }
  try {
    await recordTodayNetvalue(userId);
  } catch (error) {
    console.error("[netvalue] Auto refresh after mutation failed", error);
  }
  return result;
}
