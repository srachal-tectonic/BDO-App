'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Plus,
  Clock,
  AlertCircle,
  Upload,
  Ban,
  Loader2,
} from 'lucide-react';
import { BrokerToken } from '@/types';
import { authenticatedPost, authenticatedGet } from '@/lib/authenticatedFetch';
import { Button } from '@/components/ui/button';

interface BrokerTokenWithMeta extends BrokerToken {
  magicLink: string;
  isExpired: boolean;
}

interface BrokerTokenManagerProps {
  projectId: string;
}

export default function BrokerTokenManager({ projectId }: BrokerTokenManagerProps) {
  const [tokens, setTokens] = useState<BrokerTokenWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form state for creating new token
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [brokerEmail, setBrokerEmail] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedGet(`/api/broker/tokens?projectId=${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tokens');
      }

      setTokens(data.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCreateToken = async () => {
    setCreating(true);
    setError(null);

    try {
      const response = await authenticatedPost('/api/broker/tokens', {
        projectId,
        expiresInDays,
        brokerEmail: brokerEmail || undefined,
        brokerName: brokerName || undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create token');
      }

      // Reset form and refresh list
      setShowCreateForm(false);
      setBrokerEmail('');
      setBrokerName('');
      setExpiresInDays(30);
      fetchTokens();

      // Auto-copy the new link
      if (data.magicLink) {
        navigator.clipboard.writeText(data.magicLink);
        setCopiedToken(data.token);
        setTimeout(() => setCopiedToken(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token');
    } finally {
      setCreating(false);
    }
  };

  const getIdToken = async () => {
    const { auth } = await import('@/lib/firebase');
    return auth.currentUser?.getIdToken() || '';
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to revoke this token? The broker will no longer be able to upload files.')) {
      return;
    }

    try {
      const token = await getIdToken();
      const response = await fetch(`/api/broker/tokens/${tokenId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRevoked: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke token');
      }

      fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke token');
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/broker/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${await getIdToken()}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete token');
      }

      fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete token');
    }
  };

  const copyToClipboard = async (link: string, tokenId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(tokenId);
      setTimeout(() => setCopiedToken(null), 3000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Broker Access Links</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTokens}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Link
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Create New Broker Link</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Broker Name (optional)
                </label>
                <input
                  type="text"
                  value={brokerName}
                  onChange={(e) => setBrokerName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Broker Email (optional)
                </label>
                <input
                  type="email"
                  value={brokerEmail}
                  onChange={(e) => setBrokerEmail(e.target.value)}
                  placeholder="broker@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Link Expires In
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateToken}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Link'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tokens List */}
      <div className="divide-y divide-gray-200">
        {loading && tokens.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Link2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No broker links created yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a link to allow brokers to upload documents
            </p>
          </div>
        ) : (
          tokens.map((token) => (
            <div
              key={token.id}
              className={`px-4 py-3 ${
                token.isRevoked || token.isExpired ? 'bg-gray-50 opacity-75' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {token.brokerName && (
                      <span className="text-sm font-medium text-gray-900">
                        {token.brokerName}
                      </span>
                    )}
                    {token.brokerEmail && (
                      <span className="text-sm text-gray-500">
                        {token.brokerName ? `(${token.brokerEmail})` : token.brokerEmail}
                      </span>
                    )}
                    {!token.brokerName && !token.brokerEmail && (
                      <span className="text-sm text-gray-500">Anonymous Link</span>
                    )}
                    {token.isRevoked && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                        Revoked
                      </span>
                    )}
                    {token.isExpired && !token.isRevoked && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {formatDate(token.expiresAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      {token.uploadCount} uploads
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!token.isRevoked && !token.isExpired && (
                    <>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(token.magicLink, token.id)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Copy link"
                      >
                        {copiedToken === token.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeToken(token.id)}
                        className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                        title="Revoke link"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteToken(token.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
