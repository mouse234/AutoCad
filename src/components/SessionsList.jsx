import { useState, useEffect } from 'react';
import './SessionsList.css';

const SessionsList = ({ currentSessionId, onResumeSession, onClose }) => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null);

    useEffect(() => {
        const fetchSessions = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/sessions');
                const data = await res.json();
                if (data.sessions) {
                    setSessions(data.sessions);
                }
            } catch (err) {
                console.error('Failed to fetch sessions:', err);
                setError('Failed to load sessions');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSessions();
    }, []);

    const handleResume = (sessionId) => {
        onResumeSession(sessionId);
        onClose();
    };

    const handleDelete = async (sessionId, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this session? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/session/${sessionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setSessions(sessions.filter(s => s.id !== sessionId));
                if (selectedSession?.id === sessionId) {
                    setSelectedSession(null);
                }
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="sessions-list-backdrop" onClick={onClose}>
            <div className="sessions-list-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sessions-modal-header">
                    <h2>Design Sessions</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="sessions-content">
                    {isLoading ? (
                        <div className="sessions-loading">
                            <div className="mini-spinner"></div>
                            <p>Loading sessions...</p>
                        </div>
                    ) : error ? (
                        <div className="sessions-error">
                            <p>⚠️ {error}</p>
                            <button onClick={() => window.location.reload()}>Retry</button>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="sessions-empty">
                            <p>📝 No sessions yet</p>
                            <p className="muted">Start designing to create a new session</p>
                        </div>
                    ) : (
                        <div className="sessions-list">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`session-item ${session.id === currentSessionId ? 'active' : ''} ${
                                        selectedSession?.id === session.id ? 'selected' : ''
                                    }`}
                                    onClick={() => setSelectedSession(session)}
                                >
                                    <div className="session-main" onClick={() => handleResume(session.id)}>
                                        <div className="session-icon">📐</div>
                                        <div className="session-info">
                                            <div className="session-title">
                                                Design #{sessions.indexOf(session) + 1}
                                                {session.id === currentSessionId && <span className="current-badge">Current</span>}
                                            </div>
                                            <div className="session-meta">
                                                <span className="meta-item">{session.messageCount} messages</span>
                                                <span className="meta-divider">•</span>
                                                <span className="meta-item">{formatDate(session.createdAt)}</span>
                                            </div>
                                            <div className="session-dates">
                                                <small>Created: {new Date(session.createdAt).toLocaleDateString()} {formatTime(session.createdAt)}</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="session-actions">
                                        <button
                                            className="resume-btn"
                                            onClick={() => handleResume(session.id)}
                                            title="Resume this session"
                                        >
                                            ▶
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => handleDelete(session.id, e)}
                                            title="Delete this session"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {sessions.length > 0 && (
                    <div className="sessions-footer">
                        <p className="footer-text">Click a session to view its progress and models</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionsList;
