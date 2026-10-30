import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AccountMenu from './AccountMenu';
import PageHeaderView, { SignInButton, type AppPage } from './PageHeaderView';

/** PageHeaderView with the visitor's account: their menu and sign out, or sign in. */
export default function PageHeader({ page, leading, actions }: { page?: AppPage; leading?: ReactNode; actions?: ReactNode }) {
  const { user, isPremium, signOut, setAuthModalOpen } = useAuth();
  const account = user ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <AccountMenu />
      <button
        onClick={() => signOut()}
        style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 'var(--fs-9)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)',
          padding: '2px 7px', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
        }}
      >
        Sign out
      </button>
    </div>
  ) : (
    <SignInButton onClick={() => setAuthModalOpen(true)} />
  );
  return <PageHeaderView page={page} leading={leading} actions={actions} isPremium={isPremium} account={account} />;
}
