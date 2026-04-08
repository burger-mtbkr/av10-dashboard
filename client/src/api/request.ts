export const post = (path: string) => fetch(path, { method: "POST" });

export const postJson = (path: string, body: unknown) =>
  fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });