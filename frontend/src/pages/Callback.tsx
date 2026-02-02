import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Amplify handles the OAuth callback automatically
    // Just redirect to home after a short delay
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Completing sign in...</p>
      </div>
    </div>
  );
}
