import { Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SessionPage from './pages/SessionPage';
import NewSession from './pages/NewSession';
import Callback from './pages/Callback';

function App() {
  return (
    <Authenticator
      socialProviders={['google']}
      signUpAttributes={['email', 'name']}
      loginMechanisms={['email']}
    >
      {({ signOut, user }) => (
        <Layout user={user} signOut={signOut}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessions/new" element={<NewSession />} />
            <Route path="/sessions/:sessionId" element={<SessionPage />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </Authenticator>
  );
}

export default App;
