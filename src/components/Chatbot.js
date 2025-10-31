import { useState } from 'react';

export default function Chatbot() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message) return;

    const userMessage = { role: 'user', content: message };
    const newChat = [...chat, userMessage];
    setChat(newChat);
    setMessage('');
    setLoading(true);

    const response = await fetch('/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: newChat }), // Pass the whole chat history
    });

    const data = await response.json();
    setChat((prevChat) => [...prevChat, { role: 'bot', content: data.response }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 flex flex-col h-96">
      <div className="flex-grow overflow-y-auto mb-4">
        {chat.map((msg, index) => (
          <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              {msg.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <span className="inline-block p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
              Pensando...
            </span>
          </div>
        )}
      </div>
      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          placeholder="Escribe tu mensaje..."
        />
        <button type="submit" className="w-full mt-2 p-2 bg-blue-500 text-white rounded-lg" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
