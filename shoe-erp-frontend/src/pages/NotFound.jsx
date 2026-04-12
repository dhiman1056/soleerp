import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-9xl font-extrabold text-blue-600 mb-4 opacity-20">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="btn-primary w-full sm:w-auto px-8"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
