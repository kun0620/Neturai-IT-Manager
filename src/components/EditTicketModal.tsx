import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Tables, TablesUpdate } from '../types/supabase';

interface EditTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated: () => void;
  ticket: Tables<'tickets'> | null; // The ticket data to edit
}

type Status = Tables<'statuses'>;
type Category = Tables<'categories'>;
type Profile = Tables<'profiles'>;

const EditTicketModal: React.FC<EditTicketModalProps> = ({ isOpen, onClose, onTicketUpdated, ticket }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<Status[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setTitle('');
      setDescription('');
      setStatusId(null);
      setCategoryId(null);
      setAssignedTo(null);
      setError(null);
      setSuccess(null);
      return;
    }

    // Populate form fields with existing ticket data
    if (ticket) {
      setTitle(ticket.title || '');
      setDescription(ticket.description || '');
      setStatusId(ticket.status_id);
      setCategoryId(ticket.category_id);
      setAssignedTo(ticket.assigned_to);
    }

    const fetchDropdownData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: statusData, error: statusError } = await supabase.from('statuses').select('*');
        if (statusError) throw statusError;
        setStatuses(statusData);

        const { data: categoryData, error: categoryError } = await supabase.from('categories').select('*');
        if (categoryError) throw categoryError;
        setCategories(categoryData);

        const { data: profileData, error: profileError } = await supabase.from('profiles').select('id, full_name');
        if (profileError) throw profileError;
        setProfiles(profileData);

      } catch (err: any) {
        console.error('Error fetching dropdown data:', err.message);
        setError('Failed to load necessary data for ticket editing.');
      } finally {
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, [isOpen, ticket]); // Re-run when modal opens or ticket changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!ticket?.id) {
      setError('No ticket selected for editing.');
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setError('Ticket title cannot be empty.');
      setLoading(false);
      return;
    }

    // Convert empty strings from select inputs to null for UUID fields
    const finalStatusId = statusId === '' ? null : statusId;
    const finalCategoryId = categoryId === '' ? null : categoryId;
    const finalAssignedTo = assignedTo === '' ? null : assignedTo;

    const updatedTicket: TablesUpdate<'tickets'> = {
      title: title.trim(),
      description: description.trim(),
      status_id: finalStatusId,
      category_id: finalCategoryId,
      assigned_to: finalAssignedTo,
      updated_at: new Date().toISOString(), // Update the updated_at timestamp
    };

    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update(updatedTicket)
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      setSuccess('Ticket updated successfully!');
      onTicketUpdated(); // Notify parent to refresh list
      setTimeout(onClose, 1500); // Close modal after a short delay
    } catch (err: any) {
      console.error('Error updating ticket:', err.message);
      setError(`Failed to update ticket: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Edit Ticket</h2>
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
            <label htmlFor="title" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
              placeholder="Enter ticket title"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
              placeholder="Provide a detailed description of the issue"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Status
              </label>
              <select
                id="status"
                value={statusId || ''}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
              >
                {loading ? (
                  <option value="">Loading statuses...</option>
                ) : (
                  statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Category
              </label>
              <select
                id="category"
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
              >
                {loading ? (
                  <option value="">Loading categories...</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
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
              Update Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTicketModal;
