import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { notifyError } from '@/lib/notify';
import { Tables, TablesInsert } from '../types/supabase';

interface NewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetCreated: () => void;
}

type Profile = Tables<'profiles'>;

const NewAssetModal: React.FC<NewAssetModalProps> = ({ isOpen, onClose, onAssetCreated }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState('Active'); // Default status
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setName('');
      setType('');
      setSerialNumber('');
      setStatus('Active');
      setAssignedTo(null);
      setPurchaseDate('');
      setWarrantyEndDate('');
      setError(null);
      setSuccess(null);
      return;
    }

    const fetchProfiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.from('profiles').select('id, full_name');
        if (error) throw error;
        setProfiles(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load profiles';
        notifyError('Failed to load profiles', message);
        setError('Failed to load profiles for assignment.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Asset name cannot be empty.');
      setLoading(false);
      return;
    }

    // Convert empty strings from select inputs to null for UUID fields
    const finalAssignedTo = assignedTo === '' ? null : assignedTo;
    const finalPurchaseDate = purchaseDate === '' ? null : purchaseDate;
    const finalWarrantyEndDate = warrantyEndDate === '' ? null : warrantyEndDate;

    const newAsset: TablesInsert<'assets'> = {
      name: name.trim(),
      type: type.trim(),
      serial_number: serialNumber.trim(),
      status: status,
      assigned_to: finalAssignedTo,
      purchase_date: finalPurchaseDate,
      warranty_end_date: finalWarrantyEndDate,
    };

    try {
      const { error: insertError } = await supabase
        .from('assets')
        .insert(newAsset);

      if (insertError) throw insertError;

      setSuccess('Asset created successfully!');
      onAssetCreated(); // Notify parent to refresh list
      setTimeout(onClose, 1500); // Close modal after a short delay
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create asset';
      notifyError('Failed to create asset', message);
      setError(`Failed to create asset: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">New Asset</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 p-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Asset Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
              placeholder="e.g., Dell XPS 15"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Type
              </label>
              <input
                type="text"
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
                placeholder="e.g., Laptop, Monitor, Server"
              />
            </div>
            <div>
              <label htmlFor="serialNumber" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Serial Number
              </label>
              <input
                type="text"
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
                placeholder="Enter serial number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
              >
                <option value="Active">Active</option>
                <option value="In Repair">In Repair</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Assigned To
              </label>
              <select
                id="assignedTo"
                value={assignedTo || ''}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
              >
                <option value="">Unassigned</option>
                {loading ? (
                  <option value="">Loading profiles...</option>
                ) : (
                  profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                id="purchaseDate"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
              />
            </div>
            <div>
              <label htmlFor="warrantyEndDate" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Warranty End Date
              </label>
              <input
                type="date"
                id="warrantyEndDate"
                value={warrantyEndDate}
                onChange={(e) => setWarrantyEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-md flex items-center justify-center"
              disabled={loading}
            >
              {loading && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
              Create Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAssetModal;
