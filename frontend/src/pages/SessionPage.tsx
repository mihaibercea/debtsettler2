import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSession, settleSession, reopenSession, deleteSession } from '../services/api';
import { Session } from '../types';
import { computeSettlement } from '../utils/settlement';

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(() => Math.random());

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId]);

  async function loadSession(id: string) {
    try {
      setLoading(true);
      const data = await getSession(id);
      setSession(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }

  async function handleSettle() {
    if (!sessionId) return;
    
    try {
      setSettling(true);
      const result = await settleSession(sessionId, localTransfers);
      setSession(prev => prev ? { 
        ...prev, 
        status: 'settled', 
        transfers: result.transfers 
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to settle session');
    } finally {
      setSettling(false);
    }
  }

  async function handleReopen() {
    if (!sessionId) return;

    try {
      setReopening(true);
      await reopenSession(sessionId);
      setSession(prev => prev ? { ...prev, status: 'draft', transfers: [] } : null);
      setSeed(Math.random());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reopen session');
    } finally {
      setReopening(false);
    }
  }

  async function handleDelete() {
    if (!sessionId || !confirm('Are you sure you want to delete this session?')) return;
    
    try {
      await deleteSession(sessionId);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }

  const participants = Array.isArray(session?.participants) ? session.participants : [];
  const sessionTransfers = Array.isArray(session?.transfers) ? session.transfers : [];
  const participantKey = participants.map(p => `${p.name}:${p.amount}`).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const localTransfers = useMemo(() => computeSettlement(participants), [seed, participantKey]);
  const transfers = sessionTransfers.length > 0 ? sessionTransfers : localTransfers;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Session not found</p>
        <Link to="/" className="text-primary-500 hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            &larr; Back to sessions
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          <p className="text-sm text-gray-500">
            Created {new Date(session.createdAt).toLocaleDateString()} •{' '}
            <span className={session.status === 'settled' ? 'text-green-600' : 'text-yellow-600'}>
              {session.status}
            </span>
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete session"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Participants */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
        <div className="space-y-2">
          {participants.map((p) => (
            <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">{p.name}</span>
              <span className={`font-semibold ${p.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {p.amount >= 0 ? '+' : ''}{p.amount.toFixed(2)} {session.currency}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transfers */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Settlement Transfers ({transfers.length})
          </h2>
          {session.status !== 'settled' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSeed(Math.random())}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Randomize
              </button>
              <button
                onClick={handleSettle}
                disabled={settling}
                className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {settling ? 'Settling...' : 'Confirm Settlement'}
              </button>
            </div>
          )}
        </div>

        {transfers.length === 0 ? (
          <p className="text-gray-500">No transfers needed - everyone is balanced!</p>
        ) : (
          <div className="space-y-3">
            {transfers.map((t) => (
              <div key={t.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 flex items-center">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-sm">
                      {t.from.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="ml-3 font-medium">{t.from}</span>
                </div>
                
                <div className="flex items-center px-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="ml-2 font-bold text-lg">{t.amount.toFixed(2)} {session.currency}</span>
                  <svg className="w-6 h-6 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>

                <div className="flex-1 flex items-center justify-end">
                  <span className="mr-3 font-medium">{t.to}</span>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-sm">
                      {t.to.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {session.status === 'settled' && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-green-700 font-medium">This session has been settled!</span>
            <button
              onClick={handleReopen}
              disabled={reopening}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-700 border border-yellow-400 rounded-lg hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {reopening ? 'Reopening...' : 'Reopen & Randomize'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
