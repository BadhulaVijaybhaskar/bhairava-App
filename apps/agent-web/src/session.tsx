import { createContext, useContext } from 'react';
import type { PublicUser } from '@bhairava/api-client';

/** Unread notifications are counted from one capped `unreadOnly` page. */
export const UNREAD_CAP = 100;

export type AgentSession = {
  user: PublicUser | null;
  /** `null` until the first unread fetch settles. */
  unreadCount: number | null;
  refreshUnread: () => void;
  signOut: () => void;
};

export const SessionContext = createContext<AgentSession>({
  user: null,
  unreadCount: null,
  refreshUnread: () => {},
  signOut: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}
