import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  Flame, 
  Info, 
  CheckCircle2, 
  X, 
  ExternalLink,
  Trash2
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  titre: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
  lien?: string;
  lu: boolean;
  cree_a: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onNavigateTab?: (tab: string) => void;
  onUnreadChange?: (newCount: number) => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  token,
  onNavigateTab,
  onUnreadChange
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/notifications?limit=40`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        if (onUnreadChange) {
          onUnreadChange(data.unread_count || 0);
        }
      }
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchNotifications();
    }
  }, [isOpen, token]);

  const handleMarkAsRead = async (id: string, lien?: string) => {
    if (!token) return;
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
      const newUnread = notifications.filter(n => !n.lu && n.id !== id).length;
      if (onUnreadChange) onUnreadChange(newUnread);

      if (lien && onNavigateTab) {
        onNavigateTab(lien);
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/v1/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
      if (onUnreadChange) onUnreadChange(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await fetch(`/api/v1/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      const remainingUnread = notifications.filter(n => !n.lu && n.id !== id).length;
      if (onUnreadChange) onUnreadChange(remainingUnread);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifs = filter === 'unread' 
    ? notifications.filter(n => !n.lu)
    : notifications;

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'DANGER':
        return <Flame size={16} color="#ef4444" />;
      case 'WARNING':
        return <AlertTriangle size={16} color="#f59e0b" />;
      case 'SUCCESS':
        return <CheckCircle2 size={16} color="#10b981" />;
      case 'INFO':
      default:
        return <Info size={16} color="#3b82f6" />;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 2) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile / outside click */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 998,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(2px)'
            }}
          />

          <motion.div 
            className="notification-center-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            style={{
              position: 'fixed',
              top: 68,
              right: 20,
              width: 'min(420px, calc(100vw - 32px))',
              maxHeight: 'min(580px, calc(100vh - 100px))',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-color)',
              borderRadius: 20,
              boxShadow: 'var(--shadow-lg), 0 20px 40px rgba(0, 0, 0, 0.35)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell size={20} color="#f59e0b" />
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Centre d'Alertes</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {notifications.some(n => !n.lu) && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    title="Tout marquer comme lu"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 6
                    }}
                  >
                    <CheckCheck size={15} />
                    <span>Tout lire</span>
                  </button>
                )}
                <button 
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{
              display: 'flex',
              gap: 8,
              padding: '10px 20px',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(0, 0, 0, 0.08)'
            }}>
              <button
                className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  borderRadius: 20,
                  border: '1px solid var(--border-color)',
                  background: filter === 'all' ? 'var(--color-primary)' : 'transparent',
                  color: filter === 'all' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Toutes ({notifications.length})
              </button>
              <button
                className={`filter-pill ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  borderRadius: 20,
                  border: '1px solid var(--border-color)',
                  background: filter === 'unread' ? 'var(--color-primary)' : 'transparent',
                  color: filter === 'unread' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Non lues ({notifications.filter(n => !n.lu).length})
              </button>
            </div>

            {/* Notifications List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px'
            }}>
              {loading && notifications.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Chargement de vos alertes...
                </div>
              ) : filteredNotifs.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <Bell size={36} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: 12 }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Aucune notification
                  </p>
                  <p style={{ margin: '6px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    {filter === 'unread' ? "Toutes vos notifications sont à jour." : "Vous recevrez ici vos alertes de dépassement de budget et de tranches."}
                  </p>
                </div>
              ) : (
                filteredNotifs.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.lien)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      marginBottom: 8,
                      background: n.lu ? 'transparent' : 'rgba(245, 158, 11, 0.06)',
                      border: n.lu ? '1px solid transparent' : '1px solid rgba(245, 158, 11, 0.25)',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = n.lu ? 'transparent' : 'rgba(245, 158, 11, 0.06)';
                    }}
                  >
                    <div style={{
                      marginTop: 2,
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getTypeIcon(n.type)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <h4 style={{ 
                          margin: 0, 
                          fontSize: 13, 
                          fontWeight: n.lu ? 700 : 800,
                          color: n.lu ? 'var(--text-primary)' : 'var(--color-primary)'
                        }}>
                          {n.titre}
                        </h4>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(n.cree_a)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {n.message}
                      </p>

                      {n.lien && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: 'var(--color-primary)', fontWeight: 700 }}>
                          <span>Voir les détails</span>
                          <ExternalLink size={12} />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      title="Supprimer"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 4,
                        opacity: 0.6,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
