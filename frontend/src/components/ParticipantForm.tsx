import { Participant } from '../types';

interface ParticipantFormProps {
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
  currency: string;
}

export default function ParticipantForm({ participants, onChange, currency }: ParticipantFormProps) {
  function updateParticipant(id: string, field: 'name' | 'amount', value: string | number) {
    onChange(
      participants.map(p =>
        p.id === id ? { ...p, [field]: field === 'amount' ? Number(value) : value } : p
      )
    );
  }

  function addParticipant() {
    const newId = String(Date.now());
    onChange([...participants, { id: newId, name: '', amount: 0 }]);
  }

  function removeParticipant(id: string) {
    if (participants.length <= 2) return;
    onChange(participants.filter(p => p.id !== id));
  }

  return (
    <div className="space-y-3">
      {participants.map((participant, index) => (
        <div key={participant.id} className="flex items-center gap-3">
          <span className="text-sm text-gray-400 w-6">{index + 1}.</span>
          
          <input
            type="text"
            value={participant.name}
            onChange={(e) => updateParticipant(participant.id, 'name', e.target.value)}
            placeholder="Name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          
          <div className="relative w-32">
            <input
              type="number"
              step="0.01"
              value={participant.amount || ''}
              onChange={(e) => updateParticipant(participant.id, 'amount', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-right"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {currency}
            </span>
          </div>

          <button
            type="button"
            onClick={() => removeParticipant(participant.id)}
            disabled={participants.length <= 2}
            className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Remove participant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addParticipant}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors"
      >
        + Add Participant
      </button>
    </div>
  );
}
