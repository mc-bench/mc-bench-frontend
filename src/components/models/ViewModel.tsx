import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  AlertCircle,
  ArrowLeft,
  Box,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  Loader2,
  Terminal,
  User,
  XCircle,
} from 'lucide-react'

import { adminAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { Model } from '../../types/models'
import { RunListData } from '../../types/runs'
import {
  hasModelAdminAccess,
  hasModelExperimentApprovalAccess,
  hasModelExperimentProposalAccess,
  hasModelReviewAccess,
} from '../../utils/permissions'
import { getStatusStyles } from '../ui/StatusStyles'

type RunPaging = {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasNext: boolean
  hasPrevious: boolean
}

const ViewModel = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [model, setModel] = useState<Model | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [currentAction, setCurrentAction] = useState<
    'PROPOSE' | 'OBSERVE' | 'APPROVE_PROPOSAL' | 'REJECT_PROPOSAL' | null
  >(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showJustificationModal, setShowJustificationModal] = useState(false)
  const [availableExperimentalStates, setAvailableExperimentalStates] =
    useState<{ id: string; name: string }[]>([])
  const [selectedExperimentalState, setSelectedExperimentalState] =
    useState<string>('')
  const [selectedProposalId, setSelectedProposalId] = useState<string>('')
  const [expandedLogs, setExpandedLogs] = useState(false)
  const [runs, setRuns] = useState<RunListData[]>([])
  const [runPaging, setRunPaging] = useState<RunPaging | null>(null)
  const [currentRunPage, setCurrentRunPage] = useState(1)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const userScopes = user?.scopes || []
  const canProposeExperiment = hasModelExperimentProposalAccess(userScopes)
  const canApproveExperiment = hasModelExperimentApprovalAccess(userScopes)
  const canMakeObservations = hasModelReviewAccess(userScopes)
  const canPerformAnyActions =
    canProposeExperiment || canApproveExperiment || canMakeObservations

  useEffect(() => {
    const fetchModel = async () => {
      try {
        setLoading(true)
        const { data } = await adminAPI.get(`/model/${id}`)
        setModel(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch model')
      } finally {
        setLoading(false)
      }
    }

    fetchModel()
  }, [id])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isActionsOpen && !target.closest('[data-dropdown-actions]')) {
        setIsActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isActionsOpen])

  useEffect(() => {
    const fetchExperimentalStates = async () => {
      try {
        const { data } = await adminAPI.get(
          '/model/metadata/experimental-state'
        )
        setAvailableExperimentalStates(data.data || [])
      } catch (err) {
        console.error('Failed to fetch experimental states:', err)
        setAvailableExperimentalStates([])
      }
    }

    fetchExperimentalStates()
  }, [])

  const toggleRun = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) {
        next.delete(runId)
      } else {
        next.add(runId)
      }
      return next
    })
  }

  const ExternalLinkButton = ({
    href,
    label,
  }: {
    href: string
    label: string
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
    >
      <ExternalLink className="h-4 w-4" />
      <span>View {label}</span>
    </a>
  )

  const handleAction = (
    type: 'PROPOSE' | 'OBSERVE',
    requireJustification: boolean = true
  ) => {
    setIsActionsOpen(false)

    if (requireJustification) {
      setCurrentAction(type)
      setShowJustificationModal(true)
    } else {
      submitAction(type)
    }
  }

  const submitAction = async (
    type: 'PROPOSE' | 'OBSERVE' | 'APPROVE_PROPOSAL' | 'REJECT_PROPOSAL',
    justificationText?: string
  ) => {
    if (!model) return

    try {
      setIsSubmitting(true)
      setError(null)

      if (type === 'PROPOSE' && selectedExperimentalState) {
        await adminAPI.post(`/model/${id}/experimental-state/proposal`, {
          current_state: model.experimentalState || 'EXPERIMENTAL',
          proposed_state: selectedExperimentalState,
          note: justificationText || 'Proposed state change',
        })
      } else if (type === 'OBSERVE') {
        await adminAPI.post(`/model/${id}/observe`, {
          note: justificationText || 'Observation added',
        })
      } else if (type === 'APPROVE_PROPOSAL' && selectedProposalId) {
        await adminAPI.post(
          `/model/${id}/experimental-state/proposal/${selectedProposalId}/approve`,
          {
            note: justificationText || 'Proposal approved',
          }
        )
      } else if (type === 'REJECT_PROPOSAL' && selectedProposalId) {
        await adminAPI.post(
          `/model/${id}/experimental-state/proposal/${selectedProposalId}/reject`,
          {
            note: justificationText || 'Proposal rejected',
          }
        )
      }

      const { data } = await adminAPI.get(`/model/${id}`)
      setModel(data)
      setShowJustificationModal(false)
      setSelectedExperimentalState('')
      setSelectedProposalId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProposalAction = async (
    proposalId: string,
    action: 'approve' | 'reject'
  ) => {
    try {
      setIsSubmitting(true)
      setError(null)

      if (action === 'approve') {
        // Directly approve without showing justification modal
        await adminAPI.post(
          `/model/${id}/experimental-state/proposal/${proposalId}/approve`,
          {
            note: 'Proposal approved',
          }
        )

        // Refresh the model data
        const { data } = await adminAPI.get(`/model/${id}`)
        setModel(data)
      } else {
        // For rejection, show the justification modal
        setCurrentAction('REJECT_PROPOSAL')
        setSelectedProposalId(proposalId)
        setShowJustificationModal(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchRuns = async (page: number) => {
    if (!id) return

    try {
      setLoadingRuns(true)
      setRunError(null)
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '50',
        model_id: id,
      })

      const { data } = await adminAPI.get(`/run?${params.toString()}`)
      setRuns(data.data)
      setRunPaging(data.paging)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to fetch runs')
    } finally {
      setLoadingRuns(false)
    }
  }

  useEffect(() => {
    fetchRuns(currentRunPage)
  }, [id, currentRunPage])

  if (loading)
    return <div className="flex justify-center p-8">Loading model...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>
  if (!model) return <div className="text-gray-500 p-4">Model not found</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with metadata */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/models')}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">
                  {model.name || model.slug}
                </h1>
                {model.name && (
                  <div className="text-sm text-gray-500">ID: {model.slug}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                    model.active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {model.active ? (
                    <CheckCircle size={14} />
                  ) : (
                    <XCircle size={14} />
                  )}
                  {model.active ? 'Active' : 'Inactive'}
                </span>
                {model.experimentalState && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                      model.experimentalState === 'RELEASED'
                        ? 'bg-green-100 text-green-700'
                        : model.experimentalState === 'EXPERIMENTAL'
                          ? 'bg-amber-100 text-amber-700'
                          : model.experimentalState === 'DEPRECATED'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {model.experimentalState === 'RELEASED' && (
                      <CheckCircle size={14} />
                    )}
                    {model.experimentalState === 'EXPERIMENTAL' && (
                      <AlertCircle size={14} />
                    )}
                    {model.experimentalState === 'DEPRECATED' && (
                      <Clock size={14} />
                    )}
                    {model.experimentalState === 'REJECTED' && (
                      <XCircle size={14} />
                    )}
                    {model.experimentalState}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canPerformAnyActions && (
                <div className="relative" data-dropdown-actions>
                  <button
                    onClick={() => setIsActionsOpen(!isActionsOpen)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Actions
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {isActionsOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1" role="menu">
                        {hasModelAdminAccess(userScopes) && (
                          <>
                            <button
                              onClick={() => navigate(`/models/${id}/edit`)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                            >
                              <div className="flex items-center gap-2">
                                <Edit className="h-4 w-4" />
                                Edit Model
                              </div>
                            </button>

                            {(canProposeExperiment || canMakeObservations) && (
                              <div className="border-t border-gray-100 my-1"></div>
                            )}
                          </>
                        )}

                        {canProposeExperiment && (
                          <button
                            onClick={() => handleAction('PROPOSE', true)}
                            disabled={isSubmitting}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400"
                            role="menuitem"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Propose Experimental State Change
                            </div>
                          </button>
                        )}

                        {canMakeObservations && (
                          <button
                            onClick={() => handleAction('OBSERVE', true)}
                            disabled={isSubmitting}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400"
                            role="menuitem"
                          >
                            <div className="flex items-center gap-2">
                              <Terminal className="h-4 w-4" />
                              Make Observation
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metadata grid with vertical dividers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 text-sm divide-x divide-gray-200">
            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 text-center mb-2">
                Created
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{new Date(model.created).toLocaleString()}</span>
              </div>
            </div>

            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 text-center mb-2">
                Created by
              </div>
              <div className="flex items-center gap-2 justify-center">
                <User className="h-4 w-4 text-gray-400" />
                <span>{model.createdBy || 'Unknown'}</span>
              </div>
            </div>

            {model.lastModified && (
              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 text-center mb-2">
                  Last Updated
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{new Date(model.lastModified).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 text-center mb-2">
                Usage Count
              </div>
              <div className="flex justify-center">
                <span className="text-gray-900 font-medium">{model.usage}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Proposals Section */}
      {model.proposals &&
        model.proposals.filter((p) => !p.accepted && !p.rejected).length >
          0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                Pending Experimental State Proposals
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Proposed By
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Current State
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Proposed State
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Justification
                      </th>
                      {canApproveExperiment && (
                        <th
                          scope="col"
                          className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {model.proposals
                      ?.filter(
                        (proposal) => !proposal.accepted && !proposal.rejected
                      )
                      .map((proposal) => (
                        <tr key={proposal.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {proposal.createdBy}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {new Date(proposal.created).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                (model.experimentalState || 'EXPERIMENTAL') ===
                                'RELEASED'
                                  ? 'bg-green-100 text-green-700'
                                  : (model.experimentalState ||
                                        'EXPERIMENTAL') === 'EXPERIMENTAL'
                                    ? 'bg-amber-100 text-amber-700'
                                    : (model.experimentalState ||
                                          'EXPERIMENTAL') === 'DEPRECATED'
                                      ? 'bg-gray-100 text-gray-700'
                                      : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {model.experimentalState || 'EXPERIMENTAL'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                proposal.proposedState === 'RELEASED'
                                  ? 'bg-green-100 text-green-700'
                                  : proposal.proposedState === 'EXPERIMENTAL'
                                    ? 'bg-amber-100 text-amber-700'
                                    : proposal.proposedState === 'DEPRECATED'
                                      ? 'bg-gray-100 text-gray-700'
                                      : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {proposal.proposedState}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {proposal.log?.note || ''}
                          </td>
                          {canApproveExperiment && (
                            <td className="px-3 py-2 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() =>
                                    handleProposalAction(proposal.id, 'approve')
                                  }
                                  className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded shadow-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() =>
                                    handleProposalAction(proposal.id, 'reject')
                                  }
                                  className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* Log Section */}
      {model.logs && model.logs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <button
            onClick={() => setExpandedLogs(!expandedLogs)}
            className="w-full p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Model Log</h2>
              <span className="text-sm text-gray-500">
                ({model.logs.length}{' '}
                {model.logs.length === 1 ? 'entry' : 'entries'})
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                expandedLogs ? 'transform rotate-180' : ''
              }`}
            />
          </button>

          {expandedLogs && (
            <div className="px-6 pb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Action
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Note
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {model.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0">
                              {log.action === 'EXPERIMENTAL_STATE_PROPOSAL' && (
                                <FileText className="w-4 h-4 text-blue-500" />
                              )}
                              {log.action === 'EXPERIMENTAL_STATE_APPROVAL' && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              {log.action ===
                                'EXPERIMENTAL_STATE_REJECTION' && (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              {log.action === 'MODEL_OBSERVATION' && (
                                <Terminal className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="text-sm text-left">
                              <div className="text-gray-900 font-medium">
                                {log.action === 'EXPERIMENTAL_STATE_PROPOSAL' &&
                                  'State Proposal'}
                                {log.action === 'EXPERIMENTAL_STATE_APPROVAL' &&
                                  'State Approval'}
                                {log.action ===
                                  'EXPERIMENTAL_STATE_REJECTION' &&
                                  'State Rejection'}
                                {log.action === 'MODEL_OBSERVATION' &&
                                  'Observation'}
                              </div>
                              {log.action === 'EXPERIMENTAL_STATE_PROPOSAL' &&
                                log.proposal && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    Proposed change to{' '}
                                    <span
                                      className={`inline-flex px-1.5 py-0.5 rounded-full text-xs ${
                                        log.proposal.proposedState ===
                                        'RELEASED'
                                          ? 'bg-green-100 text-green-700'
                                          : log.proposal.proposedState ===
                                              'EXPERIMENTAL'
                                            ? 'bg-amber-100 text-amber-700'
                                            : log.proposal.proposedState ===
                                                'DEPRECATED'
                                              ? 'bg-gray-100 text-gray-700'
                                              : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {log.proposal.proposedState}
                                    </span>
                                  </div>
                                )}
                              {log.action === 'EXPERIMENTAL_STATE_APPROVAL' &&
                                log.proposal && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    Changed state to{' '}
                                    <span
                                      className={`inline-flex px-1.5 py-0.5 rounded-full text-xs ${
                                        log.proposal.proposedState ===
                                        'RELEASED'
                                          ? 'bg-green-100 text-green-700'
                                          : log.proposal.proposedState ===
                                              'EXPERIMENTAL'
                                            ? 'bg-amber-100 text-amber-700'
                                            : log.proposal.proposedState ===
                                                'DEPRECATED'
                                              ? 'bg-gray-100 text-gray-700'
                                              : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {log.proposal.proposedState}
                                    </span>
                                  </div>
                                )}
                              {log.action === 'EXPERIMENTAL_STATE_REJECTION' &&
                                log.proposal && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    Rejected change to{' '}
                                    <span
                                      className={`inline-flex px-1.5 py-0.5 rounded-full text-xs ${
                                        log.proposal.proposedState ===
                                        'RELEASED'
                                          ? 'bg-green-100 text-green-700'
                                          : log.proposal.proposedState ===
                                              'EXPERIMENTAL'
                                            ? 'bg-amber-100 text-amber-700'
                                            : log.proposal.proposedState ===
                                                'DEPRECATED'
                                              ? 'bg-gray-100 text-gray-700'
                                              : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {log.proposal.proposedState}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-sm text-gray-900 text-left whitespace-pre-line">
                            {log.note}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 text-left align-top">
                          {log.createdBy}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 text-left align-top">
                          {new Date(log.created).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Providers Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Providers</h2>
          <div className="grid gap-4">
            {model.providers.map((provider, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  provider.isDefault
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{provider.name}</h3>
                    {provider.isDefault && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    Class: {provider.providerClass}
                  </span>
                </div>

                <div className="bg-white p-3 rounded border border-gray-200">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap text-left">
                    {JSON.stringify(provider.config, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Run History Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Run History</h2>
          {loadingRuns ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : runError ? (
            <div className="text-red-500 p-4">{runError}</div>
          ) : (
            <>
              <div className="border rounded-lg divide-y">
                {runs.length === 0 ? (
                  <div className="p-4 text-gray-500 text-sm">
                    No runs found for this model
                  </div>
                ) : (
                  runs.map((run) => (
                    <div key={run.id} className="p-4">
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={() => toggleRun(run.id)}
                      >
                        {expandedRuns.has(run.id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="flex-1 grid grid-cols-3 gap-4 ml-2">
                          <div className="flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-gray-400" />
                            <span>Prompt: {run.prompt.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-gray-400" />
                            <span>Template: {run.template.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-1 text-sm rounded-full ${getStatusStyles(run.status)}`}
                            >
                              {run.status}
                            </span>
                            <Link
                              to={`/runs/${run.id}`}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>View Run</span>
                            </Link>
                          </div>
                        </div>
                      </div>

                      {expandedRuns.has(run.id) && (
                        <div className="mt-4 ml-7 grid gap-4">
                          <div className="border rounded-lg p-4">
                            <div className="text-sm text-gray-600 space-y-2">
                              <p>Run ID: {run.id}</p>
                              <p>
                                Created:{' '}
                                {new Date(run.created).toLocaleString()}
                              </p>
                              <p>Created By: {run.createdBy}</p>
                              <div className="flex items-center gap-4 mt-2">
                                {run.prompt.id && (
                                  <ExternalLinkButton
                                    href={`/prompts/${run.prompt.id}`}
                                    label="Prompt"
                                  />
                                )}
                                {run.template.id && (
                                  <ExternalLinkButton
                                    href={`/templates/${run.template.id}`}
                                    label="Template"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {runPaging && (
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {runs.length} of {runPaging.totalItems} runs
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentRunPage(runPaging.page - 1)}
                      disabled={!runPaging.hasPrevious}
                      className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1">
                      Page {runPaging.page} of {runPaging.totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentRunPage(runPaging.page + 1)}
                      disabled={!runPaging.hasNext}
                      className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showJustificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)

              if (currentAction === 'PROPOSE') {
                submitAction(
                  currentAction,
                  formData.get('justification') as string
                )
              } else {
                submitAction(
                  currentAction!,
                  formData.get('justification') as string
                )
              }
            }}
          >
            <h3 className="text-lg font-medium mb-4">
              {currentAction === 'PROPOSE' &&
                'Propose Experimental State Change'}
              {currentAction === 'OBSERVE' && 'Add Observation'}
              {currentAction === 'APPROVE_PROPOSAL' && 'Approve Proposal'}
              {currentAction === 'REJECT_PROPOSAL' && 'Reject Proposal'}
            </h3>

            {currentAction === 'PROPOSE' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Experimental State
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableExperimentalStates.map((state) => (
                    <button
                      key={state.id}
                      type="button"
                      onClick={() => setSelectedExperimentalState(state.name)}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-colors border ${
                        selectedExperimentalState === state.name
                          ? state.name === 'RELEASED'
                            ? 'bg-green-100 text-green-700 border-green-300 ring-2 ring-green-200'
                            : state.name === 'EXPERIMENTAL'
                              ? 'bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-200'
                              : state.name === 'DEPRECATED'
                                ? 'bg-gray-100 text-gray-700 border-gray-300 ring-2 ring-gray-200'
                                : 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-200'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {state.name === 'RELEASED' && (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      {state.name === 'EXPERIMENTAL' && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {state.name === 'DEPRECATED' && (
                        <Clock className="h-4 w-4" />
                      )}
                      {state.name === 'REJECTED' && (
                        <XCircle className="h-4 w-4" />
                      )}
                      {state.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              name="justification"
              className="w-full h-32 p-2 border rounded-md mb-4"
              placeholder={
                currentAction === 'OBSERVE'
                  ? 'Enter your observation...'
                  : 'Enter your justification...'
              }
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowJustificationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (currentAction === 'PROPOSE' && !selectedExperimentalState)
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default ViewModel
