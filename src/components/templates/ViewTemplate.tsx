import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, ArrowLeft, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import { adminAPI } from '../../api/client';
import { Template } from '../../types/templates';

const ViewTemplate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const { data } = await adminAPI.get(`/template/${id}`);
        setTemplate(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch template');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id]);

  if (loading) return <div className="flex justify-center p-8">Loading template...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!template) return <div className="text-gray-500 p-4">Template not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
            template.active 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {template.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {template.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {template.usage === 0 && (
          <button
            onClick={() => navigate(`/templates/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Edit size={16} />
            Edit Template
          </button>
        )}
      </div>

        <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
            <div
                className="p-6 grid grid-cols-3 gap-6 text-sm bg-gray-50">
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
                                className="text-gray-900">{new Date(template.created).toLocaleString()}</span>
                        </div>
                    </div>
                    {template.lastModified && (
                        <div
                            className="flex items-center gap-2">
                            <Clock
                                size={16}
                                className="text-gray-400 shrink-0"/>
                            <div>
                                <span
                                    className="text-gray-500 block">Last Updated</span>
                                <span
                                    className="text-gray-900">{new Date(template.lastModified).toLocaleString()}</span>
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
                                className="text-gray-900">{template.createdBy || 'Unknown'}</span>
                        </div>
                    </div>
                </div>

                <div
                    className="space-y-4">
                    <div>
                        <span
                            className="text-gray-500 block">Usage Count</span>
                        <span
                            className="text-gray-900 font-medium">{template.usage}</span>
                        {template.usage > 0 && (
                            <span
                                className="block mt-1 text-xs text-gray-600">(cannot be edited or deleted)</span>
                        )}
                    </div>
                </div>
            </div>

            <div
                className="p-6 space-y-6">
                <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-2">Description</h2>
                    <p className="text-gray-900">{template.description}</p>
                </div>

                <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-2">Content</h2>
                    <div
                        className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <pre
                            className="font-mono text-sm whitespace-pre-wrap break-words text-left">{template.content}</pre>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ViewTemplate;