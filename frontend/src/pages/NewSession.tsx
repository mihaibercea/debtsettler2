import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession } from '../services/api';
import ParticipantForm from '../components/ParticipantForm';
import { Participant } from '../types';
import { validateBalances, computeSettlement } from '../utils/settlement';

export default function NewSession() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: '', amount: 0 },
    { id: '2', name: '', amount: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [seed, setSeed] = useState(() => Math.random());

  const validation = validateBalances(participants);
  const validParticipants = participants.filter(p => p.name.trim() !== '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter a session title');
      return;
    }

    if (validParticipants.length < 2) {
      setError('Please add at least 2 participants');
      return;
    }

    if (!validation.valid) {
      setError(`Amounts don't balance. Sum: ${validation.sum} ${currency}`);
      return;
    }

    try {
      setSaving(true);
      const result = await createSession({
        title: title.trim(),
        currency,
        participants: validParticipants.map(p => ({ name: p.name, amount: p.amount })),
      });
      navigate(`/sessions/${result.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setSaving(false);
    }
  }

  const participantKey = validParticipants.map(p => `${p.name}:${p.amount}`).join(',');
  // Re-randomize when participants change or when the user requests a new shuffle via seed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const transfers = useMemo(() => validation.valid ? computeSettlement(validParticipants) : [], [seed, participantKey]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">New Settlement Session</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Session Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Ski Trip 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="EUR">EUR (Euro)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="GBP">GBP (British Pound)</option>
              <option value="RON">RON (Romanian Leu)</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
          <p className="text-sm text-gray-500 mb-4">
            Enter each participant's name and their balance. Positive = they paid more (should receive), Negative = they owe money.
          </p>
          
          <ParticipantForm
            participants={participants}
            onChange={setParticipants}
            currency={currency}
          />

          <div className={`mt-4 p-3 rounded-lg ${validation.valid ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {validation.valid ? (
              <span>Balances are correct (sum = 0)</span>
            ) : (
              <span>Balances don't match. Difference: {validation.sum > 0 ? '+' : ''}{validation.sum} {currency}</span>
            )}
          </div>
        </div>

        {validation.valid && validParticipants.length >= 2 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center text-lg font-semibold text-gray-900"
              >
                <svg className={`w-5 h-5 mr-2 transition-transform ${showPreview ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Preview Settlement ({transfers.length} transfers)
              </button>
              {showPreview && (
                <button
                  type="button"
                  onClick={() => setSeed(Math.random())}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Randomize Settlements
                </button>
              )}
            </div>
            
            {showPreview && transfers.length > 0 && (
              <div className="mt-4 space-y-2">
                {transfers.map((t) => (
                  <div key={t.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-red-600">{t.from}</span>
                    <svg className="w-5 h-5 mx-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="font-medium text-green-600">{t.to}</span>
                    <span className="ml-auto font-semibold">{t.amount.toFixed(2)} {currency}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !validation.valid || validParticipants.length < 2}
            className="px-6 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Create Session'}
          </button>
        </div>
      </form>
    </div>
  );
}
