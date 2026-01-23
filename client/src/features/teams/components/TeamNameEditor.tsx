import { useMemo, useCallback } from 'react';

interface TeamNameEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export const TeamNameEditor = ({
  value,
  onChange,
  onSave,
  onCancel,
  isSaving
}: TeamNameEditorProps) => {
  // Memoize character count to avoid recalculation on every render
  const charCount = useMemo(() => ({
    current: value.length,
    max: 50
  }), [value.length]);

  const isValid = value.trim().length >= 3 && value.length <= 50;
  const showWarning = value.length > 50;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValid && !isSaving) {
      onSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }, [isValid, isSaving, onSave, onCancel]);

  return (
    <div className="team-name-editor flex items-center gap-2">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 50))} // Client-side truncation
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className={`
            px-3 py-2 border rounded focus:outline-none focus:ring-2
            ${showWarning ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'}
            ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          placeholder="Team name"
          autoFocus
          aria-label="Team name"
        />
        <span className="absolute right-3 top-2 text-xs text-gray-500">
          {charCount.current}/{charCount.max}
        </span>
      </div>

      <button
        onClick={onSave}
        disabled={!isValid || isSaving}
        className={`
          px-3 py-2 rounded font-semibold transition
          ${isValid && !isSaving
            ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
        title="Save team name (Enter)"
        aria-label="Save team name"
      >
        ✓
      </button>

      <button
        onClick={onCancel}
        disabled={isSaving}
        className={`
          px-3 py-2 rounded font-semibold transition
          ${isSaving
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
          }
        `}
        title="Cancel (Esc)"
        aria-label="Cancel"
      >
        ✕
      </button>

      {isSaving && (
        <span className="text-sm text-gray-500 animate-pulse">Saving...</span>
      )}
    </div>
  );
};
