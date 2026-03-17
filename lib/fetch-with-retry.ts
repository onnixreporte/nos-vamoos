const RETRYABLE_STATUS_CODES = [429, 502, 503] as const;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  return Math.pow(2, attempt) * 1000;
}

async function consumeBody(res: Response): Promise<void> {
  try {
    await res.text();
  } catch {
    // ignore
  }
}

export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  timeoutMs?: number;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...fetchOptions
  } = options;

  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const signal = controller.signal;

    try {
      const res = await fetch(url, {
        ...fetchOptions,
        signal,
      });

      clearTimeout(timeoutId);

      if (
        res.ok ||
        !RETRYABLE_STATUS_CODES.includes(res.status as (typeof RETRYABLE_STATUS_CODES)[number])
      ) {
        return res;
      }

      lastResponse = res;

      if (attempt < maxRetries) {
        await consumeBody(res);
        const delay = getRetryDelay(res, attempt);
        await sleep(delay);
      } else {
        return res;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError;
}
