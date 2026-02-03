import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';

const ChatInterface = ({ onScadGenerated }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '👋 Hi! I\'m your AI CAD Assistant. Describe any mechanical part you want to design, and I\'ll generate OpenSCAD code for you!\n\n**Examples:**\n- "Create a gear with 20 teeth"\n- "Design a mounting bracket 50x40mm with 4 holes"\n- "Make a cylindrical shaft 20mm diameter, 100mm long"'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

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
                history: messages
            });

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
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Sorry, I encountered an error. Please make sure the backend server is running and your Gemini API key is configured.'
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
                <h2>🤖 AI CAD Assistant</h2>
                <p>Powered by Gemini</p>
            </div>

            <div className="messages-container">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <div className="message-avatar">
                            {msg.role === 'user' ? '👤' : '🤖'}
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
                <button onClick={handleSend} disabled={isLoading || !input.trim()}>
                    {isLoading ? '⏳' : '📤'} Send
                </button>
            </div>
        </div>
    );
};

export default ChatInterface;
