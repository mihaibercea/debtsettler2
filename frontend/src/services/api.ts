import { fetchAuthSession } from 'aws-amplify/auth';
import { apiConfig } from '../config';
import { Session, SessionSummary, Participant, Transfer } from '../types';

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${apiConfig.endpoint}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Sessions API
export async function listSessions(): Promise<SessionSummary[]> {
  return apiRequest<SessionSummary[]>('/sessions');
}

export async function getSession(sessionId: string): Promise<Session> {
  return apiRequest<Session>(`/sessions/${sessionId}`);
}

export async function createSession(data: {
  title: string;
  currency: string;
  participants: Omit<Participant, 'id'>[];
}): Promise<{ sessionId: string }> {
  return apiRequest<{ sessionId: string }>('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSession(
  sessionId: string,
  data: {
    title?: string;
    participants?: Omit<Participant, 'id'>[];
  }
): Promise<void> {
  await apiRequest(`/sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiRequest(`/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export async function settleSession(sessionId: string, transfers: Transfer[]): Promise<{ transfers: Transfer[] }> {
  return apiRequest<{ transfers: Transfer[] }>(`/sessions/${sessionId}/settle`, {
    method: 'POST',
    body: JSON.stringify({ transfers }),
  });
}

export async function reopenSession(sessionId: string): Promise<void> {
  await apiRequest(`/sessions/${sessionId}/reopen`, { method: 'POST' });
}

// Health check
export async function healthCheck(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/health');
}
