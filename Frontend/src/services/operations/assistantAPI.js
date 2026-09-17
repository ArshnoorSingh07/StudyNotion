import { assistantEndpoints } from '../apis';

async function request(url, token, { signal, method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method, signal,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Could not reach your study assistant. Please try again.');
  }
  return response;
}

export async function getAssistantCourses(token, signal) {
  return (await request(assistantEndpoints.COURSES_API, token, { signal })).json();
}
export async function getAssistantHistory(token, courseId, signal) {
  return (await request(`${assistantEndpoints.HISTORY_API}?courseId=${encodeURIComponent(courseId)}`, token, { signal })).json();
}
export async function clearAssistantHistory(token, courseId) {
  return (await request(assistantEndpoints.HISTORY_API, token, {
    method: 'DELETE', body: { courseId }, signal: AbortSignal.timeout(15000),
  })).json();
}
export async function askAssistant(token, body, signal, onEvent) {
  const response = await request(assistantEndpoints.CHAT_API, token, { method: 'POST', body, signal });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop();
      for (const frame of frames) {
        const line = frame.split('\n').find(item => item.startsWith('data:'));
        if (!line) continue;
        const event = JSON.parse(line.slice(5).trim());
        if (event.type === 'error') throw new Error(event.message);
        if (event.type === 'done') completed = true;
        onEvent(event);
      }
    }
    if (!completed) throw new Error('The connection was interrupted. Please try again.');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
