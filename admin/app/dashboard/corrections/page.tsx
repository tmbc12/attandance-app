'use client';

import { useEffect, useState } from 'react';
import { Check, X, Clock, AlertCircle, User, Calendar } from 'lucide-react';
import api from '../../../lib/api';
import moment from 'moment';

interface CorrectionRequest {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email: string;
    employeeId: string;
    department: string | { _id: string; name: string };
  };
  attendance: {
    _id: string;
    date: string;
  };
  requestType: 'check-in' | 'check-out' | 'both';
  originalCheckIn?: {
    time: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  originalCheckOut?: {
    time: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  requestedCheckIn?: {
    time: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    notes?: string;
  };
  requestedCheckOut?: {
    time: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    notes?: string;
  };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export default function CorrectionsPage() {
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCorrections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadCorrections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = statusFilter === 'pending' 
        ? '/api/corrections/pending'
        : `/api/corrections/all?status=${statusFilter || ''}`;
      
      const response = await api.get(endpoint);
      setCorrections(response.data.corrections || []);
    } catch (error: unknown) {
      console.error('Failed to load corrections:', error);
      
      let errorMessage = 'Failed to load corrections';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response: { status: number; data: { message: string } } };
        if (errorResponse.response?.status === 401) {
          errorMessage = 'Authentication failed. Please refresh the page or log in again.';
        } else if (errorResponse.response?.data?.message) {
          errorMessage = errorResponse.response.data.message;
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (correction: CorrectionRequest, action: 'approve' | 'reject') => {
    setSelectedCorrection(correction);
    setModalAction(action);
    setReviewNotes('');
    setShowModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedCorrection || !modalAction) return;

    if (modalAction === 'reject' && reviewNotes.trim().length < 5) {
      alert('Please provide a rejection reason (at least 5 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = `/api/corrections/${selectedCorrection._id}/${modalAction}`;
      await api.post(endpoint, { notes: reviewNotes });
      
      alert(`Correction request ${modalAction}d successfully!`);
      setShowModal(false);
      loadCorrections();
    } catch (error: unknown) {
      console.error(`Failed to ${modalAction} correction:`, error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : `Failed to ${modalAction} correction`;
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: Check, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: X, label: 'Rejected' },
    };

    const style = config[status] || config.pending;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {style.label}
      </span>
    );
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'check-in': 'Check-in Only',
      'check-out': 'Check-out Only',
      'both': 'Both Times',
    };
    return labels[type] || type;
  };

  const formatTime = (time?: string) => {
    return time ? moment(time).format('hh:mm A') : 'Not recorded';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Corrections</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage attendance correction requests from employees.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex space-x-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'approved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'rejected'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={loadCorrections}
              className="text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Corrections List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : corrections.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {corrections.map((correction) => (
              <li key={correction._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {correction.employee.name}
                          </p>
                          <p className="text-sm text-gray-500">{correction.employee.email}</p>
                        </div>
                      </div>
                      {getStatusBadge(correction.status)}
                    </div>

                    {/* Request Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        Date: {moment(correction.attendance.date).format('MMM DD, YYYY')}
                      </div>
                      <div className="text-sm text-gray-500">
                        Type: <span className="font-medium">{getRequestTypeLabel(correction.requestType)}</span>
                      </div>
                    </div>

                    {/* Time Comparison */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Original Times */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                            Original Times
                          </h4>
                          <div className="space-y-1 text-sm">
                            <p>Check-in: {formatTime(correction.originalCheckIn?.time)}</p>
                            <p>Check-out: {formatTime(correction.originalCheckOut?.time)}</p>
                          </div>
                        </div>

                        {/* Requested Times */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                            Requested Times
                          </h4>
                          <div className="space-y-1 text-sm text-blue-600 font-medium">
                            {correction.requestedCheckIn?.time && (
                              <p>Check-in: {formatTime(correction.requestedCheckIn.time)}</p>
                            )}
                            {correction.requestedCheckOut?.time && (
                              <p>Check-out: {formatTime(correction.requestedCheckOut.time)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Reason</h4>
                      <p className="text-sm text-gray-700">{correction.reason}</p>
                    </div>

                    {/* Review Notes */}
                    {correction.reviewNotes && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <h4 className="text-xs font-semibold text-yellow-800 uppercase mb-1">
                          {correction.status === 'approved' ? 'Admin Note' : 'Rejection Reason'}
                        </h4>
                        <p className="text-sm text-yellow-900">{correction.reviewNotes}</p>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>Requested: {moment(correction.createdAt).format('MMM DD, YYYY hh:mm A')}</p>
                      {correction.reviewedAt && (
                        <p>Reviewed: {moment(correction.reviewedAt).format('MMM DD, YYYY hh:mm A')}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {correction.status === 'pending' && (
                    <div className="ml-4 flex flex-col space-y-2">
                      <button
                        onClick={() => handleOpenModal(correction, 'approve')}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleOpenModal(correction, 'reject')}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No correction requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter
                ? `No ${statusFilter} correction requests found`
                : 'No correction requests available'}
            </p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showModal && selectedCorrection && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {modalAction === 'approve' ? 'Approve' : 'Reject'} Correction Request
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Employee: <span className="font-medium">{selectedCorrection.employee.name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Date: <span className="font-medium">{moment(selectedCorrection.attendance.date).format('MMM DD, YYYY')}</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {modalAction === 'approve' ? 'Notes (Optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={modalAction === 'approve' 
                  ? 'Add any notes for this approval...'
                  : 'Please provide a reason for rejection (min 5 characters)'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSubmitReview}
                disabled={isSubmitting}
                className={`flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                  modalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {isSubmitting ? 'Processing...' : modalAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

