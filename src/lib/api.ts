export class RequestError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) {super(message);}
}
export async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(20000)});
  } catch {throw new RequestError('เชื่อมต่อไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่', 0);}
  const value = await response.json();
  if (!response.ok) throw new RequestError(value.message || 'ทำรายการไม่สำเร็จ', response.status, value.retryAfter);
  return value as T;
}
