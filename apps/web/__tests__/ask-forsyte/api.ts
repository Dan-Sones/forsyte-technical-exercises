import { http, HttpResponse, type JsonBodyType } from 'msw';
import { API_BASE_URL } from '@/lib/api-config';
import { server } from '../msw-server';

export type RecordedRequest = {
  method: string;
  /** The path after the API base URL, still percent-encoded. */
  path: string;
  authorization: string | null;
  accept: string | null;
  contentType: string | null;
  /** The parsed JSON body, or undefined when there was none. */
  body: unknown;
};

type Reply =
  | { status: number; json: JsonBodyType }
  | { status: number; text: string }
  | 'network-error';

/**
 * Answers every request to the API with `reply` and records what was sent.
 * `onRequest` runs before the reply, for tests that act mid-flight.
 */
export function mockAgentApi(reply: Reply, onRequest?: () => void) {
  const requests: RecordedRequest[] = [];
  server.use(
    http.all(`${API_BASE_URL}/*`, async ({ request }) => {
      const raw = await request.text();
      requests.push({
        method: request.method,
        path: request.url.slice(API_BASE_URL.length),
        authorization: request.headers.get('Authorization'),
        accept: request.headers.get('Accept'),
        contentType: request.headers.get('Content-Type'),
        body: raw === '' ? undefined : JSON.parse(raw),
      });
      onRequest?.();

      if (reply === 'network-error') return HttpResponse.error();
      if ('text' in reply) {
        return new HttpResponse(reply.text, { status: reply.status });
      }
      return HttpResponse.json(reply.json, { status: reply.status });
    })
  );
  return { requests };
}
