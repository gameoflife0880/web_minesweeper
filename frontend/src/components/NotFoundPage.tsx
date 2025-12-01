import { Link } from "react-router-dom";
import { useCurrentPath } from "../hooks/useCurrentPath";

export const NotFoundPage = () => {
    const path = useCurrentPath();
    
    return (
      <div className="p-10 bg-red-50 rounded-xl border-4 border-red-300 text-center shadow-2xl animate-pulse">
        <div className="text-6xl font-black text-red-600 mb-4">
          404
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-3">
          Page Not Found
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          The path <code className="bg-red-200 p-1 rounded-md text-red-800 font-mono">{path}</code> does not match any existing routes.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
        >
          Go Back to Home
        </Link>
      </div>
    );
  };