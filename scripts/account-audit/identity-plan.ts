export type LegacyIdentity = { oldId: string; collections: string[]; roles: string[] };
export type CanonicalIdentity = { id: string; email?: string; role: string };
export type IdentityProof = {
  oldId: string;
  sharedId: string;
  evidence: 'canonical-id' | 'both-methods-authenticated' | 'reviewed-authority-export';
  reference: string;
};

export function planIdentityMigration(
  legacy: LegacyIdentity[],
  canonical: CanonicalIdentity[],
  proofs: IdentityProof[] = [],
) {
  const ids = new Map(canonical.map((account) => [account.id, account]));
  if (ids.size !== canonical.length) throw new Error('Conflicting canonical IDs');
  const rows = legacy.map((identity) => {
    const proof = proofs.filter((candidate) => candidate.oldId === identity.oldId);
    const destinations = new Set(proof.map((candidate) => candidate.sharedId));
    const sharedId = destinations.size === 1 ? [...destinations][0] : null;
    const account = sharedId ? ids.get(sharedId) : undefined;
    let status = 'pending-authority-proof';
    if (destinations.size > 1) status = 'conflicting-mapping';
    else if (
      proof.length &&
      (!account ||
        proof.some(
          (candidate) =>
            !candidate.reference.trim() ||
            !['canonical-id', 'both-methods-authenticated', 'reviewed-authority-export'].includes(
              candidate.evidence,
            ) ||
            (candidate.evidence === 'canonical-id' && candidate.oldId !== candidate.sharedId),
        ))
    )
      status = 'invalid-proof';
    else if (
      account &&
      identity.roles.some((role) => role === 'professional' && account.role !== 'professional')
    )
      status = 'professional-conflict';
    else if (account) status = 'ready-for-review';
    return { ...identity, sharedId, status, proof };
  });
  const destinations = new Map<string, string[]>();
  for (const row of rows)
    if (row.sharedId)
      destinations.set(row.sharedId, [...(destinations.get(row.sharedId) ?? []), row.oldId]);
  for (const row of rows)
    if (row.sharedId && new Set(destinations.get(row.sharedId)).size > 1)
      row.status = 'many-to-one-review';
  return {
    mode: 'proposal-only',
    rows,
    applyAllowed: false,
    rule: 'Emails are never identity proof. Preserve names, methods, roles, subscriptions and all ownership references.',
  };
}
