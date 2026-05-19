import React from 'react';
import { KeyRound } from 'lucide-react';
import type { SshKeygenTabletState, TabMode } from './sshKeygenTypes';
import { GeneratorPanel } from './components/GeneratorPanel';
import { InspectorPanel } from './components/InspectorPanel';

interface SshKeygenUIProps {
  state: SshKeygenTabletState;
  onChange: (state: SshKeygenTabletState) => void;
}

export const SshKeygenUI: React.FC<SshKeygenUIProps> = ({ state, onChange }) => {
  const { data } = state;

  const update = (partial: Partial<typeof data>) =>
    onChange({ ...state, data: { ...data, ...partial } });

  const tabs: { id: TabMode; label: string }[] = [
    { id: 'generate', label: 'Generate' },
    { id: 'inspect', label: 'Inspect' },
  ];

  return (
    <div data-testid="ssh-keygen-interface" className="h-full flex flex-col bg-canvas text-main">
      <div className="flex-shrink-0 flex items-center justify-between border-b border-base/30 px-3 pt-2 pb-0">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-main">SSH Key Generator</h2>
        </div>
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => update({ tab: tab.id })}
              className={`px-3 py-1.5 text-sm border-b-2 transition-colors ${
                data.tab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-main'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {data.tab === 'generate' ? (
          <GeneratorPanel
            data={data}
            onChange={partial => update(partial)}
          />
        ) : (
          <InspectorPanel
            inspectMode={data.inspectMode}
            onInspectModeChange={mode => update({ inspectMode: mode })}
          />
        )}
      </div>
    </div>
  );
};
