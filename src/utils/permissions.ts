export const hasTemplateAccess = (scopes: string[] = []) => {
  return scopes.some((scope) =>
    ['template:read', 'template:write', 'template:admin'].includes(scope)
  )
}

// TODO: Update to real permissions
export const hasPromptAccess = (scopes: string[] = []) => {
  return scopes.some((scope) =>
    ['prompt:read', 'prompt:write', 'prompt:admin'].includes(scope)
  )
}

// TODO: Update to real permissions
export const hasModelsAccess = (scopes: string[] = []) => {
  return scopes.some((scope) =>
    ['model:read', 'model:write', 'model:admin'].includes(scope)
  )
}

export const hasGenerationAccess = (scopes: string[] = []) => {
  return scopes.some((scope) =>
    ['generation:read', 'generation:write', 'generation:admin'].includes(scope)
  )
}

export const hasGenerationWriteAccess = (scopes: string[] = []) => {
  return scopes.some((scope) =>
    ['generation:admin', 'generation:write'].includes(scope)
  )
}

export const hasRunAccess = (scopes: string[] = []) => {
  return scopes.some((scope) =>
    ['run:read', 'run:write', 'run:admin'].includes(scope)
  )
}

export const hasSampleAccess = (scopes: string[] = []) => {
  return scopes.some((scope) =>
    ['sample:read', 'sample:review', 'sample:admin'].includes(scope)
  )
}

export const hasVotingAdminAccess = (scopes: string[] = []) => {
  return scopes.some((scope) => scope === 'voting:admin')
}

export const hasSampleReviewAccess = (scopes: string[]): boolean => {
  return scopes.some(
    (scope) => scope === 'sample:review' || scope === 'sample:admin'
  )
}

export const hasPromptExperimentProposalAccess = (
  scopes: string[]
): boolean => {
  return scopes.some(
    (scope) =>
      scope === 'prompt:experiment:propose' ||
      scope === 'prompt:admin' ||
      scope === 'prompt:experiment:approve'
  )
}

export const hasPromptExperimentApprovalAccess = (
  scopes: string[]
): boolean => {
  return scopes.some(
    (scope) => scope === 'prompt:experiment:approve' || scope === 'prompt:admin'
  )
}

export const hasTemplateExperimentProposalAccess = (
  scopes: string[]
): boolean => {
  return scopes.some(
    (scope) =>
      scope === 'template:experiment:propose' ||
      scope === 'template:admin' ||
      scope === 'template:experiment:approve'
  )
}

export const hasTemplateExperimentApprovalAccess = (
  scopes: string[]
): boolean => {
  return scopes.some(
    (scope) =>
      scope === 'template:experiment:approve' || scope === 'template:admin'
  )
}

export const hasTemplateReviewAccess = (scopes: string[]): boolean => {
  return scopes.some(
    (scope) => scope === 'template:review' || scope === 'template:admin'
  )
}

export const hasModelExperimentProposalAccess = (scopes: string[]): boolean => {
  return scopes.some(
    (scope) =>
      scope === 'model:experiment:propose' ||
      scope === 'model:admin' ||
      scope === 'model:experiment:approve'
  )
}

export const hasModelExperimentApprovalAccess = (scopes: string[]): boolean => {
  return scopes.some(
    (scope) => scope === 'model:experiment:approve' || scope === 'model:admin'
  )
}

export const hasModelReviewAccess = (scopes: string[]): boolean => {
  return scopes.some(
    (scope) => scope === 'model:review' || scope === 'model:admin'
  )
}

export const hasModelAdminAccess = (scopes: string[]): boolean => {
  return scopes.some((scope) => scope === 'model:admin')
}
