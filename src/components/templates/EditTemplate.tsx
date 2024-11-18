import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import { adminAPI } from '../../api/client';
import { Template } from '../../types/templates';

const EditTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<Template>>({
    name: '',
    description: '',
    content: ''
  });
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const { data } = await adminAPI.get(`/template/${id}`);
        setOriginalTemplate(data);
        setFormData({
          name: data.name,
          description: data.description,
          content: data.content
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch template');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalTemplate || originalTemplate.usage > 0) {
      setError('Cannot edit a template that is in use');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await adminAPI.patch(`/template/${id}`, {
        ...formData,
        active: originalTemplate.active
      });
      navigate(`/templates/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading template...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!originalTemplate) return <div className="text-gray-500 p-4">Template not found</div>;
  if (originalTemplate.usage > 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
          This template cannot be edited because it is currently in use.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Edit Template</h1>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
            originalTemplate.active 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {originalTemplate.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {originalTemplate.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <button
          onClick={() => navigate(`/templates/${id}`)}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

        <div
            className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div
                className="p-6 grid grid-cols-3 gap-6 text-sm bg-gray-50 border-b border-gray-200">
                <div
                    className="space-y-4">
                    <div
                        className="flex items-center gap-2">
                        <Clock
                            size={16}
                            className="text-gray-400 shrink-0"/>
                        <div>
                            <span
                                className="text-gray-500 block">Created</span>
                            <span
                                className="text-gray-900">{new Date(originalTemplate.created).toLocaleString()}</span>
                        </div>
                    </div>
                    {originalTemplate.lastModified && (
                        <div
                            className="flex items-center gap-2">
                            <Clock
                                size={16}
                                className="text-gray-400 shrink-0"/>
                            <div>
                                <span
                                    className="text-gray-500 block">Last Updated</span>
                                <span
                                    className="text-gray-900">{new Date(originalTemplate.lastModified).toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div
                    className="space-y-4">
                    <div
                        className="flex items-center gap-2">
                        <User
                            size={16}
                            className="text-gray-400 shrink-0"/>
                        <div>
                            <span
                                className="text-gray-500 block">Created By</span>
                            <span
                                className="text-gray-900">{originalTemplate.createdBy || 'Unknown'}</span>
                        </div>
                    </div>
                </div>

                <div
                    className="space-y-4">
                    <div>
                        <span
                            className="text-gray-500 block">Usage Count</span>
                        <span
                            className="text-gray-900 font-medium">{originalTemplate.usage}</span>
                        {originalTemplate.usage > 0 && (
                            <span
                                className="block mt-1 text-xs text-gray-600">(cannot be edited or deleted)</span>
                        )}
                    </div>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="p-6 space-y-6">
                <div
                    className="space-y-2">
                    <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700">
                        Template
                        Name
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div
                    className="space-y-2">
                    <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700">
                        Description
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        required
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div
                    className="space-y-2">
                    <label
                        htmlFor="content"
                        className="block text-sm font-medium text-gray-700">
                        Template
                        Content
                    </label>
                    <textarea
                        id="content"
                        name="content"
                        required
                        value={formData.content}
                        onChange={handleChange}
                        rows={8}
                        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm whitespace-pre text-left"
                        style={{fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'}}
                    />
                </div>

                <div
                    className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => navigate(`/templates/${id}`)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default EditTemplate;