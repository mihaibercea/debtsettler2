import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listSessions, deleteSession } from '../services/api';
import { SessionSummary } from '../types';

export default function Dashboard() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      setLoading(true);
      const data = await listSessions();
      // Ensure we have an array (API might return placeholder or error object)
      setSessions(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      // If API fails, just show empty state (backend not deployed yet)
      setSessions([]);
      const message = err instanceof Error ? err.message : 'Failed to load sessions';
      // Don't show error if it's just the placeholder API
      if (!message.includes('Placeholder')) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      await deleteSession(sessionId);
      setSessions(sessions.filter(s => s.sessionId !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Sessions</h1>
        <Link
          to="/sessions/new"
          className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No sessions yet</h3>
          <p className="mt-2 text-gray-500">Get started by creating a new settlement session.</p>
          <Link
            to="/sessions/new"
            className="mt-4 inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Create your first session
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {sessions.map((session) => (
            <div key={session.sessionId} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <Link to={`/sessions/${session.sessionId}`} className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{session.title}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(session.createdAt).toLocaleDateString()} • {session.currency} •{' '}
                  <span className={session.status === 'settled' ? 'text-green-600' : 'text-yellow-600'}>
                    {session.status}
                  </span>
                </p>
              </Link>
              <button
                onClick={() => handleDelete(session.sessionId)}
                className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete session"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
