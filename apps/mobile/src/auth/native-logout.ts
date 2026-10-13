import { serverUrls } from '../config';
import { readResponse } from '../services/api-error';

export async function revokeNativeCredential(refreshToken: string | null) {
  if (refreshToken)
    await readResponse(
      await fetch(`${serverUrls().main}/auth/native/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(10000),
      }),
    );
}
