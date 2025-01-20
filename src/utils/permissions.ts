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

export const hasSampleReviewAccess = (scopes: string[] = []) => {
  return scopes.some((scope) =>
    ['sample:review', 'sample:admin'].includes(scope)
  )
}
