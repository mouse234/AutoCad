import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';

// Debug: Test backend connection
const testBackendConnection = async () => {
    try {
        const res = await fetch('http://localhost:3001/api/health');
        const data = await res.json();
        console.log('✅ Backend healthy:', data);
        return data;
    } catch (err) {
        console.error('❌ Backend not responding:', err);
        return null;
    }
};

const ChatInterface = ({ onScadGenerated, sessionId, onSessionChange, initialMessages, onMessagesChange }) => {
    const [messages, setMessages] = useState(initialMessages || [
        {
            role: 'assistant',
            content: 'Welcome to CAD Design Studio. Describe the mechanical part you need and our Advanced AI Design Engine will produce parametric OpenSCAD code.\n\nExamples:\n- Create a gear with 20 teeth and 5mm bore\n- Mounting bracket 50 x 40 mm with four clearance holes\n- Cylindrical shaft, 20 mm diameter, 100 mm length'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Update messages when initialMessages change (e.g., when resuming a session)
    useEffect(() => {
        if (initialMessages && initialMessages.length > 0) {
            setMessages(initialMessages);
        }
    }, [initialMessages]);

    // Notify parent of message changes
    useEffect(() => {
        if (onMessagesChange) {
            onMessagesChange(messages);
        }
    }, [messages, onMessagesChange]);

    // Test backend on mount
    useEffect(() => {
        testBackendConnection();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:3001/api/chat', {
                message: input,
                sessionId: sessionId
            });

            // Update sessionId if received from server
            if (response.data.sessionId && !sessionId) {
                onSessionChange(response.data.sessionId);
            }

            const assistantMessage = {
                role: 'assistant',
                content: response.data.message
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Extract SCAD code if present
            if (response.data.scadCode) {
                onScadGenerated(response.data.scadCode, response.data.fileName || 'design.scad');
            }
        } catch (error) {
            console.error('Chat Error:', error);
            console.error('Error response:', error.response?.data);
            const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Unknown error';
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Error: ${errorMsg}\n\nPlease check:\n- Backend server is running on http://localhost:3001\n- API_KEY is properly configured in server/.env`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-interface">
            <div className="chat-header">
                <h2>Design Assistant</h2>
                <p className="muted">Powered by Advanced AI</p>
            </div>

            <div className="messages-container">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <div className="message-avatar" aria-hidden>
                            {msg.role === 'user' ? 'U' : 'G'}
                        </div>
                        <div className="message-content">
                            {msg.content.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message assistant">
                        <div className="message-avatar">🤖</div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe the CAD part you want to create..."
                    disabled={isLoading}
                    rows={3}
                />
                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="send-btn">
                    {isLoading ? 'Sending…' : 'Send'}
                </button>
            </div>
        </div>
    );
};

export default ChatInterface;
