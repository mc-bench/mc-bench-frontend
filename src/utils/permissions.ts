export const hasTemplateAccess = (scopes: string[] = []) => {
  return scopes.some(scope =>
    ['template:read', 'template:write', 'template:admin'].includes(scope)
  );
};