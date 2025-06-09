import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { repositoryService, AnalysisStatus } from '../../services/repositoryService';

interface AnalysisStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: string | null;
  repositoryName: string;
}

const AnalysisStatusModal: React.FC<AnalysisStatusModalProps> = ({
  isOpen,
  onClose,
  analysisId,
  repositoryName
}) => {
  const [analysis, setAnalysis] = useState<AnalysisStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !analysisId) return;

    const pollAnalysisStatus = async () => {
      try {
        const response = await repositoryService.getAnalysisStatus(analysisId);
        setAnalysis(response.analysis);

        if (response.analysis.status === 'completed' || response.analysis.status === 'failed') {
          return; // Stop polling
        }

        // Continue polling every 2 seconds
        setTimeout(pollAnalysisStatus, 2000);
      } catch (err: any) {
        setError(err.message || 'Failed to get analysis status');
      }
    };

    pollAnalysisStatus();
  }, [isOpen, analysisId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-gray-600';
      default: return 'text-blue-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />;
      default:
        return (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Repository Analysis
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Repository Name */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Analyzing: <span className="font-medium">{repositoryName}</span>
            </p>
          </div>

          {error ? (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center space-x-3">
                {getStatusIcon(analysis.status)}
                <div>
                  <p className={`font-medium ${getStatusColor(analysis.status)}`}>
                    {analysis.currentStep}
                  </p>
                  <p className="text-sm text-gray-500">
                    {analysis.progress}% complete
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analysis.progress}%` }}
                ></div>
              </div>

              {/* Stats */}
              {analysis.stats && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Files</p>
                    <p className="font-medium">{analysis.stats.totalFiles}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Chunks</p>
                    <p className="font-medium">{analysis.stats.totalChunks}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Embeddings</p>
                    <p className="font-medium">{analysis.stats.embeddingsGenerated}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Score</p>
                    <p className="font-medium">{analysis.stats.analysisScore}%</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {analysis.status === 'failed' && analysis.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-sm">{analysis.error}</p>
                </div>
              )}

              {/* Completion Message */}
              {analysis.status === 'completed' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 text-sm">
                    ✅ Analysis completed successfully! The repository has been analyzed and is ready for deployment recommendations.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Starting analysis...</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end mt-6 space-x-3">
            {analysis?.status === 'completed' || analysis?.status === 'failed' ? (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
              >
                Run in Background
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisStatusModal; 