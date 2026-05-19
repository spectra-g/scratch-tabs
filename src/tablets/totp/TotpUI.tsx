import React, { useState } from 'react';
import { Plus, Lock } from 'lucide-react';
import type { TotpAccount, TotpData } from './totpTypes';
import { AccountCard } from './AccountCard';
import { AddAccountModal } from './AddAccountModal';
import { VerifyPanel } from './VerifyPanel';
import { useCountdown } from './useCountdown';

interface TotpUIProps {
  data: TotpData;
  onChange: (data: TotpData) => void;
}

export const TotpUI: React.FC<TotpUIProps> = ({ data, onChange }) => {
  const { tick } = useCountdown();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TotpAccount | undefined>(undefined);

  const update = (partial: Partial<TotpData>) => onChange({ ...data, ...partial });

  const handleSave = (account: TotpAccount) => {
    const accounts = editTarget
      ? data.accounts.map((a) => (a.id === account.id ? account : a))
      : [...data.accounts, account];
    update({ accounts });
    setModalOpen(false);
    setEditTarget(undefined);
  };

  const handleEdit = (account: TotpAccount) => {
    setEditTarget(account);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    update({ accounts: data.accounts.filter((a) => a.id !== id) });
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditTarget(undefined);
  };

  const isEmpty = data.accounts.length === 0;

  return (
    <div className="h-full flex flex-col bg-canvas text-main">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-base/30 px-3 pt-2 pb-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => update({ mode: 'codes' })}
            className={`px-3 py-1.5 text-sm border-b-2 transition-colors ${
              data.mode === 'codes'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-main'
            }`}
          >
            Codes
          </button>
          <button
            onClick={() => update({ mode: 'verify' })}
            className={`px-3 py-1.5 text-sm border-b-2 transition-colors ${
              data.mode === 'verify'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-main'
            }`}
          >
            Verify
          </button>
        </div>

        {data.mode === 'codes' && (
          <button
            onClick={() => { setEditTarget(undefined); setModalOpen(true); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity mb-1"
            data-testid="add-account-button"
          >
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {data.mode === 'codes' && (
          <>
            {isEmpty ? (
              <EmptyState onAdd={() => { setEditTarget(undefined); setModalOpen(true); }} />
            ) : (
              <div className="p-3 space-y-2">
                {data.accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    tick={tick}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {data.mode === 'verify' && (
          <VerifyPanel
            secret={data.verifySecret}
            code={data.verifyCode}
            onSecretChange={(v) => update({ verifySecret: v })}
            onCodeChange={(v) => update({ verifyCode: v })}
          />
        )}
      </div>

      {modalOpen && (
        <AddAccountModal
          editAccount={editTarget}
          onSave={handleSave}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 gap-4">
    <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center">
      <Lock size={22} className="text-muted" />
    </div>
    <div>
      <p className="text-main font-medium">No accounts yet</p>
      <p className="text-muted text-sm mt-1">Add your first 2FA account to get started.</p>
    </div>
    <button
      onClick={onAdd}
      className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
      data-testid="add-first-account-button"
    >
      <Plus size={14} /> Add account
    </button>
    <p className="text-xs text-muted max-w-xs">
      Secrets are stored locally and never leave your device.
    </p>
  </div>
);
