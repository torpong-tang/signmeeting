import { appPath } from "@/lib/paths";

export async function getResponseError(response: Response, fallback: string) {
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return result.error || result.message || fallback;
}

export async function requestJson<T>(
  path: string,
  init: RequestInit | undefined,
  fallback: string,
): Promise<T> {
  const response = await fetch(appPath(path), init);
  if (!response.ok) {
    throw new Error(await getResponseError(response, fallback));
  }
  return (await response.json()) as T;
}

export async function requestOk(
  path: string,
  init: RequestInit | undefined,
  fallback: string,
) {
  const response = await fetch(appPath(path), init);
  if (!response.ok) {
    throw new Error(await getResponseError(response, fallback));
  }
}
