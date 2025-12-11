'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../lib/hooks/useRedux';
import { closeModal } from '../../lib/slices/uiSlice';
import { bulkInvite } from '../../lib/slices/employeeSlice';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

interface CsvRow {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  role?: string;
}

interface ValidationError {
  row: number;
  errors: string[];
  data?: CsvRow;
}

export default function BulkInviteModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.modals.bulkInvite);
  const isLoading = useAppSelector((state) => state.employees.isLoading);

  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const validateData = useCallback((data: CsvRow[]) => {
    setIsValidating(true);
    const errors: ValidationError[] = [];
    
    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      
      if (!row.name || row.name.trim() === '') {
        rowErrors.push('Name is required');
      }
      if (!row.email || row.email.trim() === '') {
        rowErrors.push('Email is required');
      } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(row.email)) {
        rowErrors.push('Invalid email format');
      }
      if (!row.department || row.department.trim() === '') {
        rowErrors.push('Department is required');
      }
      if (!row.designation || row.designation.trim() === '') {
        rowErrors.push('Designation is required');
      }
      
      if (rowErrors.length > 0) {
        errors.push({
          row: index + 1,
          errors: rowErrors,
          data: row
        });
      }
    });
    
    setValidationErrors(errors);
    setCsvData(data);
    setIsValidating(false);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const data = results.data as CsvRow[];
          validateData(data);
        },
        error: () => {
          toast.error('Error parsing CSV file');
        }
      });
    }
  }, [validateData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  const downloadTemplate = () => {
    const template = [
      {
        name: 'John Doe',
        email: 'john.doe@company.com',
        department: 'Engineering',
        designation: 'Software Engineer',
        role: 'employee'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        department: 'Marketing',
        designation: 'Marketing Manager',
        role: 'manager'
      }
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    if (csvData.length === 0) {
      toast.error('Please upload a CSV file');
      return;
    }

    try {
      const result = await dispatch(bulkInvite(csvData)).unwrap();
      
      let message = `Bulk invite completed! `;
      message += `Created: ${result.created.length}, `;
      message += `Duplicates: ${result.duplicates.length}, `;
      message += `Invalid: ${result.invalid.length}`;
      
      if (result.errors.length > 0) {
        message += `, Errors: ${result.errors.length}`;
      }
      
      toast.success(message);
      dispatch(closeModal('bulkInvite'));
      setCsvData([]);
      setValidationErrors([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process bulk invite';
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    dispatch(closeModal('bulkInvite'));
    setCsvData([]);
    setValidationErrors([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Bulk Invite Employees
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      How to use bulk invite
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Download the template CSV file below</li>
                        <li>Fill in employee details (name, email, department, designation, role)</li>
                        <li>Upload the completed CSV file</li>
                        <li>Review validation results and submit</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Template */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </button>
              </div>

              {/* File Upload */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    {isDragActive
                      ? 'Drop the CSV file here...'
                      : 'Drag & drop a CSV file here, or click to select'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    CSV files only, max 10MB
                  </p>
                </div>
              </div>

              {/* Validation Results */}
              {isValidating && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Validating data...</span>
                </div>
              )}

              {csvData.length > 0 && !isValidating && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      Data Preview ({csvData.length} employees)
                    </h4>
                    {validationErrors.length === 0 && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">All data is valid</span>
                      </div>
                    )}
                  </div>

                  {validationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Validation Errors ({validationErrors.length} rows)
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <ul className="list-disc pl-5 space-y-1">
                              {validationErrors.slice(0, 5).map((error, index) => (
                                <li key={index}>
                                  Row {error.row}: {error.errors.join(', ')}
                                </li>
                              ))}
                              {validationErrors.length > 5 && (
                                <li>... and {validationErrors.length - 5} more errors</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Table Preview */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Designation
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvData.slice(0, 10).map((row, index) => (
                          <tr key={index} className={validationErrors.some(e => e.row === index + 1) ? 'bg-red-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.designation}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.role || 'employee'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 10 && (
                      <p className="text-center text-sm text-gray-500 py-2">
                        ... and {csvData.length - 10} more rows
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || csvData.length === 0 || validationErrors.length > 0}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Send Invitations'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



