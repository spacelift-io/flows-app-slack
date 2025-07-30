export async function callSlackApi<T extends Record<string, any>>(
  method: string,
  payload: Record<string, any>,
  token: string,
  contentType: "json" | "form" = "json",
): Promise<T & { ok: boolean }> {
  const isFormEncoded = contentType === "form";

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": isFormEncoded
        ? "application/x-www-form-urlencoded"
        : "application/json; charset=utf-8",
    },
    body: isFormEncoded
      ? new URLSearchParams(payload).toString()
      : JSON.stringify(payload),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(
      `Slack API error (${method}): ${data.error || "Unknown error"}`,
    );
  }

  return data;
}
