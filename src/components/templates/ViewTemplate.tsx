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
import { RunListData } from '../../types/runs'
import { Template } from '../../types/templates'
import {
  hasTemplateExperimentApprovalAccess,
  hasTemplateExperimentProposalAccess,
  hasTemplateReviewAccess,
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

const ViewTemplate = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<Template | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = useState(false)
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

  const [runs, setRuns] = useState<RunListData[]>([])
  const [runPaging, setRunPaging] = useState<RunPaging | null>(null)
  const [currentRunPage, setCurrentRunPage] = useState(1)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const { user } = useAuth()

  const userScopes = user?.scopes || []
  const canProposeExperiment = hasTemplateExperimentProposalAccess(userScopes)
  const canApproveExperiment = hasTemplateExperimentApprovalAccess(userScopes)
  const canMakeObservations = hasTemplateReviewAccess(userScopes)
  const canPerformAnyActions =
    canProposeExperiment || canApproveExperiment || canMakeObservations

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true)
        const { data } = await adminAPI.get(`/template/${id}`)
        setTemplate(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch template'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [id])

  useEffect(() => {
    const fetchExperimentalStates = async () => {
      try {
        const { data } = await adminAPI.get(
          '/template/metadata/experimental-state'
        )
        setAvailableExperimentalStates(data.data || [])
      } catch (err) {
        console.error('Failed to fetch experimental states:', err)
        setAvailableExperimentalStates([])
      }
    }

    fetchExperimentalStates()
  }, [])

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
    if (!template) return

    try {
      setIsSubmitting(true)
      setError(null)

      // These endpoints are theoretical and would need to be implemented on the backend
      if (type === 'PROPOSE' && selectedExperimentalState) {
        await adminAPI.post(`/template/${id}/experimental-state/proposal`, {
          current_state: template.experimentalState || 'EXPERIMENTAL',
          proposed_state: selectedExperimentalState,
          note: justificationText || 'Proposed state change',
        })
      } else if (type === 'OBSERVE') {
        await adminAPI.post(`/template/${id}/observe`, {
          note: justificationText || 'Observation added',
        })
      } else if (type === 'APPROVE_PROPOSAL' && selectedProposalId) {
        await adminAPI.post(
          `/template/${id}/experimental-state/proposal/${selectedProposalId}/approve`,
          {
            note: justificationText || 'Proposal approved',
          }
        )
      } else if (type === 'REJECT_PROPOSAL' && selectedProposalId) {
        await adminAPI.post(
          `/template/${id}/experimental-state/proposal/${selectedProposalId}/reject`,
          {
            note: justificationText || 'Proposal rejected',
          }
        )
      }

      // Refresh the template data
      const { data } = await adminAPI.get(`/template/${id}`)
      setTemplate(data)
      setShowJustificationModal(false)
      setSelectedExperimentalState('')
      setSelectedProposalId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update handleProposalAction to directly approve without justification
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
          `/template/${id}/experimental-state/proposal/${proposalId}/approve`,
          {
            note: 'Proposal approved',
          }
        )

        // Refresh the template data
        const { data } = await adminAPI.get(`/template/${id}`)
        setTemplate(data)
      } else {
        // For rejection, still show the justification modal
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

  const fetchRuns = async (page: number) => {
    if (!id) return

    try {
      setLoadingRuns(true)
      setRunError(null)
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '50',
        template_id: id,
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
    return <div className="flex justify-center p-8">Loading template...</div>
  if (error) return <div className="text-red-500 p-4">{error}</div>
  if (!template)
    return <div className="text-gray-500 p-4">Template not found</div>

  // Find pending proposals
  const pendingProposals =
    template.proposals?.filter(
      (proposal) => !proposal.accepted && !proposal.rejected
    ) || []

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with metadata */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/templates')}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{template.name}</h1>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${template.active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                    }`}
                >
                  {template.active ? (
                    <CheckCircle size={14} />
                  ) : (
                    <XCircle size={14} />
                  )}
                  {template.active ? 'Active' : 'Inactive'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${(template.experimentalState || 'EXPERIMENTAL') === 'RELEASED'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : (template.experimentalState || 'EXPERIMENTAL') === 'EXPERIMENTAL'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : (template.experimentalState || 'EXPERIMENTAL') === 'DEPRECATED'
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}
                >
                  {(template.experimentalState || 'EXPERIMENTAL') === 'RELEASED' && (
                    <CheckCircle size={14} />
                  )}
                  {(template.experimentalState || 'EXPERIMENTAL') === 'EXPERIMENTAL' && (
                    <AlertCircle size={14} />
                  )}
                  {(template.experimentalState || 'EXPERIMENTAL') === 'DEPRECATED' && (
                    <Clock size={14} />
                  )}
                  {(template.experimentalState || 'EXPERIMENTAL') === 'REJECTED' && (
                    <XCircle size={14} />
                  )}
                  {template.experimentalState || 'EXPERIMENTAL'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canPerformAnyActions && (
                <div className="relative" data-dropdown-actions>
                  <button
                    onClick={() => setIsActionsOpen(!isActionsOpen)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Actions
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {isActionsOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1" role="menu">
                        {template.usage === 0 && (
                          <>
                            <button
                              onClick={() => {
                                setIsActionsOpen(false)
                                navigate(`/templates/${id}/edit`)
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              role="menuitem"
                            >
                              <div className="flex items-center gap-2">
                                <Edit className="h-4 w-4" />
                                Edit Template
                              </div>
                            </button>

                            {(canProposeExperiment || canMakeObservations) && (
                              <div className="border-t border-gray-100 dark:border-gray-600 my-1"></div>
                            )}
                          </>
                        )}

                        {canProposeExperiment && (
                          <button
                            onClick={() => handleAction('PROPOSE', true)}
                            disabled={isSubmitting}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500"
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
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 text-sm divide-x divide-gray-200 dark:divide-gray-700">
            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                Created
              </div>
              <div className="flex items-center gap-2 justify-center text-gray-700 dark:text-gray-300">
                <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span>{new Date(template.created).toLocaleString()}</span>
              </div>
            </div>

            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                Created by
              </div>
              <div className="flex items-center gap-2 justify-center text-gray-700 dark:text-gray-300">
                <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span>{template.createdBy}</span>
              </div>
            </div>

            {template.lastModified && (
              <div className="px-4 first:pl-0 last:pr-0">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  Last Updated
                </div>
                <div className="flex items-center gap-2 justify-center text-gray-700 dark:text-gray-300">
                  <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span>
                    {new Date(template.lastModified).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="px-4 first:pl-0 last:pr-0">
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                Usage Count
              </div>
              <div className="flex justify-center text-gray-700 dark:text-gray-300">
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {template.usage}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Proposals Section - Only visible when there are pending proposals */}
      {pendingProposals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Pending Experimental State Proposals
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Proposed By
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Current State
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Proposed State
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      Justification
                    </th>
                    {canApproveExperiment && (
                      <th
                        scope="col"
                        className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingProposals.map((proposal) => (
                    <tr key={proposal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                        {proposal.createdBy}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(proposal.created).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${(template.experimentalState || 'EXPERIMENTAL') === 'RELEASED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : (template.experimentalState || 'EXPERIMENTAL') === 'EXPERIMENTAL'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : (template.experimentalState || 'EXPERIMENTAL') === 'DEPRECATED'
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}
                        >
                          {template.experimentalState || 'EXPERIMENTAL'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${proposal.proposedState === 'RELEASED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : proposal.proposedState === 'EXPERIMENTAL'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : proposal.proposedState === 'DEPRECATED'
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}
                        >
                          {proposal.proposedState}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
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

      {/* Log Section - Only visible when there are logs */}
      {template.logs && template.logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setExpandedLogs(!expandedLogs)}
            className="w-full p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Template Log</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({template.logs.length}{' '}
                {template.logs.length === 1 ? 'entry' : 'entries'})
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${expandedLogs ? 'transform rotate-180' : ''
                }`}
            />
          </button>

          {expandedLogs && (
            <div className="px-6 pb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Action
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Note
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {template.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                              {log.action === 'TEMPLATE_OBSERVATION' && (
                                <Terminal className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="text-sm text-left">
                              <div className="text-gray-900 dark:text-gray-100 font-medium">
                                {log.action === 'EXPERIMENTAL_STATE_PROPOSAL' &&
                                  'State Proposal'}
                                {log.action === 'EXPERIMENTAL_STATE_APPROVAL' &&
                                  'State Approval'}
                                {log.action ===
                                  'EXPERIMENTAL_STATE_REJECTION' &&
                                  'State Rejection'}
                                {log.action === 'TEMPLATE_OBSERVATION' &&
                                  'Observation'}
                              </div>
                              {log.action === 'EXPERIMENTAL_STATE_PROPOSAL' &&
                                log.proposal && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Proposed change to{' '}
                                    <span
                                      className={`inline-flex px-1.5 py-0.5 rounded-full text-xs ${log.proposal.proposedState === 'RELEASED'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : log.proposal.proposedState === 'EXPERIMENTAL'
                                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                          : log.proposal.proposedState === 'DEPRECATED'
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                        }`}
                                    >
                                      {log.proposal.proposedState}
                                    </span>
                                  </div>
                                )}
                              {log.action === 'EXPERIMENTAL_STATE_APPROVAL' &&
                                log.proposal && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Changed state to{' '}
                                    <span
                                      className={`inline-flex px-1.5 py-0.5 rounded-full text-xs ${log.proposal.proposedState === 'RELEASED'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : log.proposal.proposedState === 'EXPERIMENTAL'
                                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                          : log.proposal.proposedState === 'DEPRECATED'
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                        }`}
                                    >
                                      {log.proposal.proposedState}
                                    </span>
                                  </div>
                                )}
                              {log.action === 'EXPERIMENTAL_STATE_REJECTION' &&
                                log.proposal && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Rejected change to{' '}
                                    <span
                                      className={`inline-flex px-1.5 py-0.5 rounded-full text-xs ${log.proposal.proposedState === 'RELEASED'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : log.proposal.proposedState === 'EXPERIMENTAL'
                                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                          : log.proposal.proposedState === 'DEPRECATED'
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
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
                          <div className="text-sm text-gray-900 dark:text-gray-100 text-left whitespace-pre-line">
                            {log.note}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 text-left align-top">
                          {log.createdBy}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-left align-top">
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

      {/* Template Description Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Description</h2>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 border border-gray-200 dark:border-gray-600 text-left">
            <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
              {template.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* Template Content Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Template Content</h2>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 border border-gray-200 dark:border-gray-600 text-left">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
              {template.content}
            </pre>
          </div>

          {template.frozen && (
            <div className="mt-3 flex items-center text-amber-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">
                This template is frozen and cannot be edited.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Run History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Run History</h2>
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
                    No runs found for this template
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
                            <Box className="h-4 w-4 text-gray-400" />
                            <span>Model: {run.model.slug}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span>Prompt: {run.prompt.name}</span>
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
                                {run.model.id && (
                                  <ExternalLinkButton
                                    href={`/models/${run.model.id}`}
                                    label="Model"
                                  />
                                )}
                                {run.prompt.id && (
                                  <ExternalLinkButton
                                    href={`/prompts/${run.prompt.id}`}
                                    label="Prompt"
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

      {/* Justification Modal */}
      {showJustificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
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
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
              {currentAction === 'PROPOSE' &&
                'Propose Experimental State Change'}
              {currentAction === 'OBSERVE' && 'Add Observation'}
              {currentAction === 'APPROVE_PROPOSAL' && 'Approve Proposal'}
              {currentAction === 'REJECT_PROPOSAL' && 'Reject Proposal'}
            </h3>

            {currentAction === 'PROPOSE' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Experimental State
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableExperimentalStates.map((state) => (
                    <button
                      key={state.id}
                      type="button"
                      onClick={() => setSelectedExperimentalState(state.name)}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-colors border ${selectedExperimentalState === state.name
                        ? state.name === 'RELEASED'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600 ring-2 ring-green-200 dark:ring-green-800'
                          : state.name === 'EXPERIMENTAL'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600 ring-2 ring-amber-200 dark:ring-amber-800'
                            : state.name === 'DEPRECATED'
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 ring-2 ring-gray-200 dark:ring-gray-700'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600 ring-2 ring-red-200 dark:ring-red-800'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
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
              className="w-full h-32 p-2 border rounded-md mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
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
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
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

export default ViewTemplate
