import React, { useState, useEffect, useCallback } from 'react';
import { Tablet, TabletState } from '../types';
import { Mail, RefreshCw, X, Loader2, Copy, Check } from 'lucide-react';

interface Email {
  id: string;
  subject: string;
  from: string;
  timestamp: number;
  body?: string;
}

interface TempEmailState extends TabletState {
  type: 'tempemail';
  data: {
    emailAddress: string;
    emailToken: string;
    emails: Email[];
    lastChecked: number;
  };
}

interface EmailModalProps {
  email: Email;
  onClose: () => void;
}

const EmailModal: React.FC<EmailModalProps> = ({ email, onClose }) => {
  // State for copy-from feedback
  const [copiedFrom, setCopiedFrom] = useState(false);
  const handleCopyFrom = async () => {
    await navigator.clipboard.writeText(email.from);
    setCopiedFrom(true);
    setTimeout(() => setCopiedFrom(false), 1500);
  };

  // State for copy-body feedback
  const [copiedBody, setCopiedBody] = useState(false);
  const handleCopyBody = async () => {
    await navigator.clipboard.writeText(email.body || '');
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 1500);
  };

  return (
    <div className="fixed inset-8 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between bg-gray-700 px-4 py-3 border-b border-gray-600">
        <div>
          <h3 className="text-gray-200 font-medium">{email.subject}</h3>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-400">From: {email.from}</p>
            <button
              onClick={handleCopyFrom}
              className={`p-1 rounded transition-colors ${copiedFrom ? 'text-green-400' : 'text-gray-400 hover:text-gray-300'}`}
              title={copiedFrom ? 'Copied!' : 'Copy sender address'}
            >
              {copiedFrom ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyBody}
            className={`p-1 rounded transition-colors ${copiedBody ? 'text-green-400' : 'text-gray-400 hover:text-gray-200'}`}
            title={copiedBody ? 'Copied!' : 'Copy email body'}
          >
            {copiedBody ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-auto custom-scrollbar">
        <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{__html: email.body || ''}}
        />
      </div>
    </div>
  );
};

export const TempEmailTablet: Tablet = {
  id: 'tempemail',
  label: 'Temporary Email',
  keywords: ['email', 'temporary', 'disposable', 'inbox'],

  createInitialState(): TempEmailState {
    return {
      type: 'tempemail',
      data: {
        emailAddress: '',
        emailToken: '',
        emails: [],
        lastChecked: 0
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    return JSON.parse(json);
  },

  render(state: TempEmailState, onChange) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generateEmail = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address');
        const data = await response.json();

        onChange({
          ...state,
          data: {
            ...state.data,
            emailAddress: data.email_addr,
            emailToken: data.sid_token,
            emails: [],
            lastChecked: Date.now()
          }
        });
      } catch (err) {
        setError('Failed to generate email address. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    };

    const checkEmails = useCallback(async () => {
      if (!state.data.emailToken || isChecking) return;

      setIsChecking(true);
      setError(null);

      try {
        const response = await fetch(
          `https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=${state.data.emailToken}`
        );
        const data = await response.json();

        if (data.list && Array.isArray(data.list)) {
          // Create a Set of existing email IDs for efficient lookup
          const existingIds = new Set(state.data.emails.map(email => email.id));

          // Filter out any emails we already have
          const newEmails = data.list
            .filter((email: any) => !existingIds.has(email.mail_id))
            .map((email: any) => ({
              id: email.mail_id,
              subject: email.subject,
              from: email.mail_from,
              timestamp: email.mail_timestamp,
            }));

          // Only update state if we have new emails
          if (newEmails.length > 0) {
            onChange({
              ...state,
              data: {
                ...state.data,
                // Add new emails to the beginning of the list
                emails: [...newEmails, ...state.data.emails],
                lastChecked: Date.now()
              }
            });
          } else {
            // Just update the last checked timestamp
            onChange({
              ...state,
              data: {
                ...state.data,
                lastChecked: Date.now()
              }
            });
          }
        }
      } catch (err) {
        setError('Failed to check for new emails. Please try again.');
      } finally {
        setIsChecking(false);
      }
    }, [state.data.emailToken, state.data.emails, isChecking, onChange]);

    const fetchEmailBody = async (emailId: string) => {
      if (!state.data.emailToken) return;

      try {
        const response = await fetch(
          `https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${emailId}&sid_token=${state.data.emailToken}`
        );
        const data = await response.json();

        const emailWithBody: Email = {
          id: data.mail_id,
          subject: data.subject,
          from: data.mail_from,
          timestamp: data.mail_timestamp,
          body: data.mail_body
        };

        setSelectedEmail(emailWithBody);
      } catch (err) {
        setError('Failed to fetch email content. Please try again.');
      }
    };

    // Auto-check for new emails every 10 seconds
    useEffect(() => {
      if (!state.data.emailToken) return;

      const interval = setInterval(checkEmails, 10000);
      return () => clearInterval(interval);
    }, [state.data.emailToken, checkEmails]);

    return (
      <div className="h-full bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700/50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="text-gray-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-100">Temporary Email</h2>
              </div>
              {state.data.emailAddress && (
                <button
                  onClick={() => checkEmails()}
                  disabled={isChecking}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                >
                  {isChecking ? (
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  ) : (
                    <RefreshCw size={16} className="text-gray-400" />
                  )}
                  <span className="text-gray-200">Check Now</span>
                </button>
              )}
            </div>

            {!state.data.emailAddress ? (
              <button
                onClick={generateEmail}
                disabled={isGenerating}
                className="mt-4 w-full py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generating...</span>
                  </div>
                ) : (
                  'Generate Email Address'
                )}
              </button>
            ) : (
              <div className="mt-4 bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                <div className="font-mono text-gray-200 break-all">
                  {state.data.emailAddress}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {state.data.emailAddress ? (
            state.data.emails.length > 0 ? (
              <div className="divide-y divide-gray-700/50">
                {state.data.emails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => fetchEmailBody(email.id)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-gray-200 font-medium">
                          {email.subject || '(no subject)'}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {email.from}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(email.timestamp * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                <p>Your inbox is empty. New emails will appear automatically.</p>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              <p>Generate an email address to get started</p>
            </div>
          )}
        </div>

        {/* Email Modal */}
        {selectedEmail && (
          <EmailModal
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
          />
        )}
      </div>
    );
  }
};