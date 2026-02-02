import { Link } from 'react-router-dom';
import { AuthUser } from 'aws-amplify/auth';

interface LayoutProps {
  children: React.ReactNode;
  user: AuthUser | undefined;
  signOut: (() => void) | undefined;
}

export default function Layout({ children, user, signOut }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">DebtSettler</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <span className="text-sm text-gray-600">
                    {user.signInDetails?.loginId || 'User'}
                  </span>
                  <button
                    onClick={signOut}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            DebtSettler - Settle debts easily among friends
          </p>
        </div>
      </footer>
    </div>
  );
}
