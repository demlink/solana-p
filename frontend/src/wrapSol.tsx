import { API_URL } from "./App";

export async function wrapSol(publicKey: string) {
  const res = await fetch(`${API_URL}/wrapSol`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publicKey,
    }),
  });
  return await res.json();
}
