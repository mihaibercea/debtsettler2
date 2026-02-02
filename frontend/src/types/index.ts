export interface Participant {
  id: string;
  name: string;
  amount: number; // positive = creditor, negative = debtor
}

export interface Transfer {
  id: string;
  from: string;
  to: string;
  amount: number;
}

export interface Session {
  sessionId: string;
  title: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'settled';
  participants: Participant[];
  transfers: Transfer[];
}

export interface SessionSummary {
  sessionId: string;
  title: string;
  currency: string;
  createdAt: string;
  status: 'draft' | 'settled';
}
