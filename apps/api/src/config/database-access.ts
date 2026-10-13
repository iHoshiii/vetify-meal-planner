import type { MongoClient } from 'mongodb';

type Privilege = { resource?: { db?: string; anyResource?: boolean }; actions?: string[] };
export function assertPlannerNamespace(uri: string) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/#]+)(?:\?[^#]*)?$/.exec(uri);
  if (!match || decodeURIComponent(match[1]).toLowerCase() === 'vetify')
    throw new Error('Use an explicit dedicated planner database namespace.');
}
export function assertRestrictedPrivileges(database: string, privileges: Privilege[]) {
  const documentActions = [
    'find',
    'insert',
    'update',
    'remove',
    'createCollection',
    'dropCollection',
    'createIndex',
  ];
  if (
    !privileges.length ||
    privileges.some(
      ({ resource, actions = [] }) =>
        resource?.anyResource ||
        (resource?.db !== undefined && resource.db !== database) ||
        (actions.some((action) => documentActions.includes(action)) &&
          (resource?.db === undefined || resource.db !== database)),
    )
  ) {
    throw new Error(
      'Planner database credentials must be restricted to the dedicated planner database.',
    );
  }
}
export async function assertPlannerDatabaseAccess(client: MongoClient, uri: string) {
  assertPlannerNamespace(uri);
  const status = await client.db().command({ connectionStatus: 1, showPrivileges: true });
  const auth = status.authInfo;
  if (
    !auth ||
    !Array.isArray(auth.authenticatedUsers) ||
    !Array.isArray(auth.authenticatedUserPrivileges)
  ) {
    throw new Error('Cannot verify planner database credential isolation.');
  }
  if (!auth.authenticatedUsers.length) {
    const local = /^mongodb:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d+\//.test(uri);
    if (process.env.NODE_ENV === 'production' || !local)
      throw new Error('Planner database authentication is required.');
    return;
  }
  assertRestrictedPrivileges(client.db().databaseName, auth.authenticatedUserPrivileges);
}
