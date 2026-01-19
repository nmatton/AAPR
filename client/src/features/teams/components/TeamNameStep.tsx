import { useState, FormEvent } from 'react';

interface TeamNameStepProps {
  onSubmit: (name: string) => void;
}

export const TeamNameStep = ({ onSubmit }: TeamNameStepProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const validateName = (name: string): boolean => {
    if (name.length < 3) {
      setError('Team name must be at least 3 characters');
      return false;
    }
    if (name.length > 100) {
      setError('Team name must be less than 100 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9\s\-]+$/.test(name)) {
      setError('Team name can only contain letters, numbers, spaces, and hyphens');
      return false;
    }
    setError('');
    return true;
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validateName(name)) {
      onSubmit(name);
    }
  };
  
  const handleBlur = () => {
    if (name.length > 0) {
      validateName(name);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
          Team Name
        </label>
        <input
          type="text"
          id="teamName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlur}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter team name (e.g., Development Team Alpha)"
          autoFocus
        />
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          {name.length}/100 characters
        </p>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!name || name.length < 3}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Next: Select Practices
        </button>
      </div>
    </form>
  );
};
