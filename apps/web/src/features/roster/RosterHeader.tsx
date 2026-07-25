import React from 'react';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  selectedWeekStart: string;
  dateRange: string;
  isReadOnly: boolean;
  isOperating: boolean;
  operationError: string | null;
  isSaving: boolean;
  rosterStatus: string | null;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  handlePublish: () => void;
  handleUnpublish: () => void;
  handleCopyForward: () => void;
  setOperationError: (err: string | null) => void;
}

export default function RosterHeader({
  dateRange,
  isReadOnly,
  isOperating,
  operationError,
  isSaving,
  rosterStatus,
  goToPreviousWeek,
  goToNextWeek,
  handlePublish,
  handleUnpublish,
  handleCopyForward,
  setOperationError,
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousWeek}
              className="px-3 py-1 border rounded hover:bg-gray-100"
            >
              ← Previous
            </button>
            <span className="font-medium">{dateRange}</span>
            <button
              onClick={goToNextWeek}
              className="px-3 py-1 border rounded hover:bg-gray-100"
            >
              Next →
            </button>
          </div>

          {isReadOnly && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Read Only
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {rosterStatus === 'draft' && (
            <button
              onClick={handlePublish}
              disabled={isOperating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOperating ? 'Publishing...' : 'Publish'}
            </button>
          )}
          {rosterStatus === 'published' && (
            <>
              <button
                onClick={handleUnpublish}
                disabled={isOperating}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOperating ? 'Unpublishing...' : 'Unpublish'}
              </button>
              <button
                onClick={handleCopyForward}
                disabled={isOperating}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOperating ? 'Copying...' : 'Copy Forward'}
              </button>
            </>
          )}
        </div>
      </div>

      {operationError && (
        <div className="mt-2 p-2 bg-red-100 text-red-800 text-sm rounded-md">
          {operationError}
          <button
            onClick={() => setOperationError(null)}
            className="ml-2 text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
        {isSaving && <span>Saving...</span>}
        {rosterStatus && (
          <span>
            Status: <span className="font-medium capitalize">{rosterStatus}</span>
          </span>
        )}
      </div>
    </>
  );
}

export { DAYS_OF_WEEK };
